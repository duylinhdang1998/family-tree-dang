# Supabase setup — giaphahodang

Database schema, RLS policies, and RPC functions for the giaphahodang app.

## Files

- `migrations/20260409000000_init.sql` — initial schema, RLS, triggers, and `get_tree_by_slug` RPC
- `seed.sql` — optional dev seed (1 owner user must already exist)

## One-time setup

1. Create a Supabase project at <https://supabase.com/dashboard>.
2. Copy the **Project URL** and **anon public key** from Project Settings → API.
3. Put them in `.env.local` at the repo root:
   ```bash
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```
4. Apply the migration. Pick ONE of these paths:

   **Path A — Supabase Dashboard (fastest, no CLI needed):**
   1. Open the project → SQL Editor → New query
   2. Paste the contents of `migrations/20260409000000_init.sql`
   3. Run. You should see "Success. No rows returned."
   4. Verify in Table Editor: `family_trees` and `persons` exist.

   **Path B — Supabase CLI (for local dev + version control):**
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

## Design constraints encoded in the schema

These are **FINAL** decisions from the Final Gate (2026-04-09). Do not
relax them without updating `docs/plan.md`:

| Decision | Mechanism in SQL |
|---|---|
| No photo storage (TASTE-D5) | No `photo_url` column on `persons`. No Supabase Storage bucket. |
| Hard delete, no tombstone (TASTE-E5) | `DELETE` on `persons` is real; no `deleted_at`. Server trigger `cleanup_person_refs` removes the deleted id from sibling `parent_ids`/`spouse_ids`. |
| Anon viewer reads only via RPC (TASTE-E2) | `revoke all on family_trees, persons from anon`. `get_tree_by_slug` is `security definer`, `grant execute to anon`. |
| Server-side `updated_at` (Q-A2) | `set_updated_at` trigger on both tables, runs `before update`. Client must not set `updated_at`. |
| Naive sync, no conflict resolution (TASTE-E1) | Nothing in SQL — intentional. `UPDATE` is last-write-wins. No `op_id`, no stale check. |
| Derived `children` list (Q4) | `persons` has no `children_ids` column; clients compute it from `parent_ids`. |

## Testing the RPC

After applying the migration and inserting a test tree with a known slug:

```sql
select public.get_tree_by_slug('demo-slug-123');
```

Expected: JSONB object `{"tree": {...}, "persons": [...]}` or `null` if slug unknown.

You can also probe the RLS hole from an anon context:

```sql
-- As anon (via PostgREST or supabase-js with anon key):
select * from public.family_trees;   -- should return 0 rows (or permission error)
select * from public.persons;         -- should return 0 rows (or permission error)
select public.get_tree_by_slug('demo-slug-123');  -- should work
```

## Common pitfalls

- **Forgot to set `public_slug` before publishing** — `public_slug` is required and unique. Generate client-side (e.g. `nanoid(10)`) on tree create.
- **`updated_at` drift** — client-set `updated_at` is silently overwritten by the trigger. That is intentional (single source of truth for LWW).
- **`root_person_id` circular FK** — it's nullable. Create the tree, then insert the root person, then `UPDATE family_trees SET root_person_id = ... WHERE id = ...`.
- **Anon sees empty result instead of error** — RLS silently filters to zero rows for `SELECT`. This is correct behavior; clients should treat "tree not found" (null from RPC) as the error path.
