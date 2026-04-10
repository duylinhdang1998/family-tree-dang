// =====================================================================
// Domain types — mirror the SQL schema in
// supabase/migrations/20260409000000_init.sql exactly. If you change
// the schema, update both files in the same commit.
// =====================================================================

export type Gender = 'male' | 'female' | 'unknown'

export interface Person {
  id: string
  tree_id: string
  full_name: string
  generation_name: string | null
  gender: Gender
  /** Free-form `YYYY` or `YYYY-MM-DD` (≤10 chars) — Vietnamese gia phả often only know the year */
  birth_date: string | null
  death_date: string | null
  birth_place: string | null
  notes: string | null
  parent_ids: string[]
  spouse_ids: string[]
  /** Generation depth from root (root = 0). Computed client-side, persisted as hint. */
  generation: number
  created_at: string
  updated_at: string
}

export interface FamilyTree {
  id: string
  owner_id: string
  name: string
  root_person_id: string | null
  public_slug: string
  created_at: string
  updated_at: string
}

/** Shape returned by the `get_tree_by_slug` security-definer RPC. */
export interface PublicTreePayload {
  tree: FamilyTree
  persons: Person[]
}

/** Sync engine outbox entry — see lib/syncEngine.ts and lib/db.ts */
export type OutboxOp =
  | { kind: 'upsert_person'; person: Person }
  | { kind: 'delete_person'; tree_id: string; person_id: string }
  | { kind: 'upsert_tree'; tree: FamilyTree }

export interface OutboxEntry {
  id: string
  op: OutboxOp
  enqueued_at: string
  attempts: number
  last_error: string | null
}
