# Test Plan — Giả Phả Họ

Target coverage: unit ≥80% on pure logic modules (`utils/`, `services/syncEngine.ts`), happy-path integration on store + storage, smoke e2e on admin and viewer flows.

Tooling: Vitest + @testing-library/react for unit/integration, Playwright for e2e, fake-indexeddb for storage, msw for Supabase REST mocking, supabase local (docker) for RLS integration.

---

## Unit tests

### U1 — `src/utils/vietnamese.test.ts` — diacritic normalization
Given inputs `["Nguyễn", "nguyen", "NGUYỄN", "Đặng Duy Linh"]`, `normalize()` returns lowercase ASCII with `đ→d`. Assert `matches("nguyen", "Nguyễn Văn A") === true`.

### U2 — `src/utils/treeLayout.test.ts` — flat → D3 hierarchy
Fixture: 12 persons, 4 generations, one person with 2 parents (adopted). Assert returned root matches expected nested shape and that adopted edge is represented exactly once.

### U3 — `src/utils/treeLayout.test.ts` — depth limiter
Tree of 6 generations; `buildHierarchy(rootId, {maxDepth: 4})` returns ≤4 levels and marks deeper nodes with `{ truncated: true, childCount: N }`.

### U4 — `src/utils/treeLayout.test.ts` — circular parent detection
Person A→B→C→A in `parentIds`. `validateAcyclic(persons)` returns `{ ok: false, cycle: [A,B,C,A] }`. No infinite loop (bounded by N).

### U5 — `src/utils/validation.test.ts` — Zod person schema
Rejects: empty `fullName`, `birthDate > deathDate`, invalid year, `parentIds.length > 2`, self in `parentIds` or `spouseIds`. Accepts partial dates `"1890"`.

### U6 — `src/services/syncEngine.test.ts` — LWW merge baseline
Local `updatedAt=T2`, remote `updatedAt=T1` → local wins, push. Reversed → remote wins, overwrite local. Equal timestamps → deterministic tiebreak by `id` lexicographic (documented).

### U7 — `src/services/syncEngine.test.ts` — field-level merge (if TASTE-1 picks CRDT-lite)
Local changes `notes` at T2; remote changes `photoUrl` at T3. Merge result contains both edits; `updatedAt = max`.

### U8 — `src/services/syncEngine.test.ts` — delete vs edit race
Remote deletes person P at T2; local edits P at T3. Result: tombstone wins only if `deletedAt > local.updatedAt`; otherwise resurrect with local fields. Assert chosen policy is honored.

### U9 — `src/services/indexedDb.test.ts` (fake-indexeddb) — schema migration v1→v2
Seed DB at version 1 with old `Person` shape (no `generationName`). Open at version 2; upgrade handler backfills `generationName: undefined` and bumps `schemaVersion`. Assert no data loss, assert idempotent re-open.

### U10 — `src/store/familyStore.test.ts` — children derivation
Add person with `parentIds:[p1]`; selector `getChildren(p1)` returns the new person without mutating `p1.childrenIds` in storage (source of truth = `parentIds`).

---

## Integration tests

### I1 — `src/services/__tests__/storage.integration.test.ts` — offline write → queue → sync
Disable network (msw offline). Call `savePerson(x)`. Assert: written to IDB, enqueued in `outbox` store, `syncStatus='pending'`. Re-enable network, run `syncEngine.flush()`; assert Supabase POST called once, outbox empty.

### I2 — `src/services/__tests__/sync.conflict.test.ts` — two-device edit
Simulate device A edits `notes="a"` at T1, device B edits `notes="b"` at T2 on same person. Run reconcile; assert no silent data loss — either chosen strategy wins with an audit entry in `conflict_log` IDB store.

### I3 — `src/services/__tests__/rls.integration.test.ts` — supabase local RLS
Using supabase-js anon client with `publicSlug='abc'`, `SELECT` on `family_trees` returns only the matching row. Attempting `UPDATE` or selecting another tree's persons returns 0 rows / error. Authenticated owner client sees full tree.

### I4 — `src/store/__tests__/tree.integrity.test.ts` — orphaned spouseIds
Delete person P referenced in Q.spouseIds. Store delete action cascades: Q.spouseIds pruned, re-render stable, no `undefined` node in layout.

### I5 — `src/components/TreeView/__tests__/TreeCanvas.integration.test.tsx` — render 500 persons
Fixture generator: 500-person synthetic tree (8 generations). Mount with depth limiter; assert first paint <500ms in jsdom (soft) and memoized selector called ≤1 per person.

### I6 — `src/services/__tests__/photoUpload.test.ts` — upload → storage → URL
Upload 3MB jpeg → client resize to ≤1MB → Supabase Storage mock returns URL → Person.photoUrl persisted locally + queued. Failure path: mock 500 → retry w/ backoff, user sees toast, photo URL remains null, person still saved.

---

## E2E tests (Playwright)

### E1 — `e2e/admin.spec.ts` — full admin flow
Login → create tree "Họ Nguyễn" → add root → add 3 generations (8 persons) → add spouse → search "nguyen" finds diacritic match → copy share link.

### E2 — `e2e/viewer.spec.ts` — public slug
Open `/view/<slug>` in incognito context. Assert tree renders, no edit buttons visible, attempting direct `POST` via devtools fetch to Supabase returns 401/empty (RLS enforced).

### E3 — `e2e/offline.spec.ts` — offline edit + reconnect
`context.setOffline(true)` → edit person → observe ⚠ Offline badge → `setOffline(false)` → assert sync badge returns to ✓ within 5s and change visible after hard reload.

### E4 — `e2e/migration.spec.ts` — IDB version bump
Seed browser IDB with v1 fixture via `page.addInitScript`, load app v2, assert no data loss and schemaVersion=2.

---

## Manual QA checklist

### M1 — Mobile viewer (iPhone SE, slow 3G throttle)
Time to first tree paint ≤4s, pinch-zoom works, no horizontal scroll, tap targets ≥44px.

### M2 — Diacritic input
Vietnamese keyboard input for `Nguyễn`, `Đặng`, `Phạm` — store roundtrip preserves exact characters, search finds both with and without marks.

### M3 — Large tree (500+ persons)
Import JSON backup of 500-person tree; verify depth limiter default works, expand-on-click reveals hidden branches, no jank on pan/zoom on mid-range Android.

### M4 — Data leak probe
With viewer slug, manually query `supabase.from('persons').select('*')` in devtools console; must return only persons belonging to that tree. Repeat for `family_trees`, `storage.objects`.
