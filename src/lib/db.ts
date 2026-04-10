import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FamilyTree, OutboxEntry, OutboxOp, Person } from '@/types'

// =====================================================================
// Local IndexedDB cache — TASTE-E1 (offline-first, naive LWW).
// Bumping DB_VERSION requires writing an upgrade path inside `upgrade()`.
// =====================================================================

const DB_NAME = 'giaphaho'
const DB_VERSION = 1

interface GiaPhaSchema extends DBSchema {
  family_trees: {
    key: string
    value: FamilyTree
    indexes: { 'by-owner': string }
  }
  persons: {
    key: string
    value: Person
    indexes: { 'by-tree': string }
  }
  outbox: {
    key: string
    value: OutboxEntry
  }
  meta: {
    key: string
    value: { key: string; value: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<GiaPhaSchema>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GiaPhaSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('family_trees')) {
          const trees = db.createObjectStore('family_trees', { keyPath: 'id' })
          trees.createIndex('by-owner', 'owner_id')
        }
        if (!db.objectStoreNames.contains('persons')) {
          const persons = db.createObjectStore('persons', { keyPath: 'id' })
          persons.createIndex('by-tree', 'tree_id')
        }
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// ---------- cache helpers ----------

/** Best-effort write; swallows IDB errors so the UI never blocks on storage. */
async function safeIdb<T>(fn: (db: IDBPDatabase<GiaPhaSchema>) => Promise<T>): Promise<T | null> {
  try {
    const db = await getDb()
    return await fn(db)
  } catch {
    return null
  }
}

export async function cacheTree(tree: FamilyTree): Promise<void> {
  await safeIdb((db) => db.put('family_trees', tree))
}

/** Replace the cached persons for a tree with the given snapshot. */
export async function cachePersons(treeId: string, persons: Person[]): Promise<void> {
  await safeIdb(async (db) => {
    const tx = db.transaction('persons', 'readwrite')
    const store = tx.objectStore('persons')
    const existing = await store.index('by-tree').getAllKeys(treeId)
    for (const k of existing) await store.delete(k)
    for (const p of persons) await store.put(p)
    await tx.done
  })
}

export async function loadCachedTreeForOwner(ownerId: string): Promise<FamilyTree | null> {
  return (
    (await safeIdb(async (db) => {
      const all = await db.getAllFromIndex('family_trees', 'by-owner', ownerId)
      if (all.length === 0) return null
      // Most recently updated wins (matches the network discovery query)
      all.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      return all[0]
    })) ?? null
  )
}

export async function loadCachedPersons(treeId: string): Promise<Person[]> {
  return (
    (await safeIdb((db) => db.getAllFromIndex('persons', 'by-tree', treeId))) ?? []
  )
}

// ---------- outbox helpers ----------

export async function enqueueOutbox(op: OutboxOp): Promise<OutboxEntry | null> {
  const entry: OutboxEntry = {
    id: cryptoRandomId(),
    op,
    enqueued_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
  }
  const ok = await safeIdb((db) => db.put('outbox', entry))
  return ok === null ? null : entry
}

/** Returns outbox entries oldest-first (FIFO drain order). */
export async function listOutboxOldest(): Promise<OutboxEntry[]> {
  const all = (await safeIdb((db) => db.getAll('outbox'))) ?? []
  return all.sort((a, b) => (a.enqueued_at < b.enqueued_at ? -1 : 1))
}

export async function removeOutboxEntry(id: string): Promise<void> {
  await safeIdb((db) => db.delete('outbox', id))
}

export async function markOutboxAttempt(id: string, error: string): Promise<void> {
  await safeIdb(async (db) => {
    const existing = await db.get('outbox', id)
    if (!existing) return
    existing.attempts += 1
    existing.last_error = error
    await db.put('outbox', existing)
  })
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
