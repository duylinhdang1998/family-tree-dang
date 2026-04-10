import { supabase } from '@/lib/supabase'
import {
  cachePersons,
  cacheTree,
  enqueueOutbox,
  listOutboxOldest,
  loadCachedPersons,
  loadCachedTreeForOwner,
  markOutboxAttempt,
  removeOutboxEntry,
} from '@/lib/db'
import { useFamilyStore } from '@/store/familyStore'
import type { FamilyTree, OutboxOp, Person } from '@/types'

// =====================================================================
// Sync engine — TASTE-E1 (naive LWW), TASTE-E4 (pull on focus + 60s).
//
// Three responsibilities:
//   1. enqueue() persists a write to the IDB outbox and triggers flush().
//      Caller is responsible for the optimistic local update (familyStore
//      already exposes upsertPerson / removePerson). We don't double-write
//      the local state here so callers stay in control of UX rollback.
//   2. flush() drains the outbox FIFO into Supabase. Re-entrant: a single
//      in-flight promise is shared so concurrent callers don't double-fire.
//      Network errors leave the entry for the next flush; PostgREST data
//      errors (PGRST*, 22*, 23*) are dropped — retrying won't help.
//   3. pullTree() / hydrateFromCache() do the read side. Pull is the
//      authoritative refresh; hydrate is the offline-first paint.
//
// We deliberately don't track per-row updatedAt cursors yet — full-table
// pull is fine for gia phả-sized trees (≤ a few hundred persons).
// =====================================================================

let flushing: Promise<void> | null = null

export async function enqueue(op: OutboxOp): Promise<void> {
  await enqueueOutbox(op)
  // Fire and forget — caller already did the optimistic local update.
  void flush()
}

export async function flush(): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    try {
      const entries = await listOutboxOldest()
      if (entries.length === 0) return

      const setSyncStatus = useFamilyStore.getState().setSyncStatus
      const markSynced = useFamilyStore.getState().markSynced
      setSyncStatus('syncing')

      for (const entry of entries) {
        try {
          await applyOp(entry.op)
          await removeOutboxEntry(entry.id)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (isFatalError(err)) {
            // Server rejected the op (e.g. row deleted, constraint violation).
            // Retrying won't help — drop and log.
            console.warn('[syncEngine] dropping outbox entry', entry.id, message)
            await removeOutboxEntry(entry.id)
            continue
          }
          // Probably a network blip. Bump attempts and bail out of this drain;
          // the next flush() (focus / online / 60s tick) will retry.
          await markOutboxAttempt(entry.id, message)
          setSyncStatus('error')
          return
        }
      }
      markSynced()
    } finally {
      flushing = null
    }
  })()
  return flushing
}

async function applyOp(op: OutboxOp): Promise<void> {
  if (op.kind === 'upsert_person') {
    const { error } = await supabase.from('persons').upsert(op.person)
    if (error) throw error
    return
  }
  if (op.kind === 'delete_person') {
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', op.person_id)
    if (error) throw error
    return
  }
  if (op.kind === 'upsert_tree') {
    const { error } = await supabase.from('family_trees').upsert(op.tree)
    if (error) throw error
    return
  }
}

/** PostgREST / Postgres errors that won't recover by retry. */
function isFatalError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const code = (err as { code?: unknown }).code
  if (typeof code !== 'string') return false
  // PGRST116 = no rows; 22xxx = data exception; 23xxx = integrity violation
  return (
    code.startsWith('PGRST') || code.startsWith('22') || code.startsWith('23')
  )
}

// ---------- pull side ----------

/**
 * Authoritative refresh of a single tree. Replaces familyStore + IDB cache
 * with whatever Supabase currently has. Throws on network or auth failure
 * so the caller can decide whether to surface it (background pollers swallow).
 */
export async function pullTree(treeId: string): Promise<void> {
  const { data: treeRow, error: treeErr } = await supabase
    .from('family_trees')
    .select('*')
    .eq('id', treeId)
    .maybeSingle()
  if (treeErr) throw treeErr
  if (!treeRow) {
    // Tree was deleted server-side. Wipe local state.
    useFamilyStore.getState().reset()
    return
  }
  const tree = treeRow as FamilyTree

  const { data: personRows, error: personsErr } = await supabase
    .from('persons')
    .select('*')
    .eq('tree_id', treeId)
    .order('generation', { ascending: true })
    .order('created_at', { ascending: true })
  if (personsErr) throw personsErr
  const persons = (personRows ?? []) as Person[]

  const store = useFamilyStore.getState()
  store.setCurrentTree(tree)
  store.setPersons(persons)
  store.markSynced()

  await cacheTree(tree)
  await cachePersons(tree.id, persons)
}

/**
 * Network discovery: find the most recently updated tree owned by `ownerId`,
 * pull it, and persist it. Used on first load when we don't yet know the
 * tree id locally.
 */
export async function pullOwnedTree(ownerId: string): Promise<FamilyTree | null> {
  const { data, error } = await supabase
    .from('family_trees')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const tree = (data?.[0] ?? null) as FamilyTree | null
  if (!tree) {
    useFamilyStore.getState().setCurrentTree(null)
    useFamilyStore.getState().setPersons([])
    return null
  }
  await pullTree(tree.id)
  return tree
}

/**
 * Best-effort offline paint: load whatever's already in IDB for this owner
 * and push it into familyStore so the UI has something to render before
 * the network round-trip resolves. Safe to call even when offline.
 */
export async function hydrateFromCache(ownerId: string): Promise<boolean> {
  const tree = await loadCachedTreeForOwner(ownerId)
  if (!tree) return false
  const persons = await loadCachedPersons(tree.id)
  const store = useFamilyStore.getState()
  store.setCurrentTree(tree)
  store.setPersons(persons)
  return true
}
