-- =====================================================================
-- Giaphahodang — initial schema
-- Created: 2026-04-09 (Final Gate)
-- Scope: family_trees + persons + RLS + RPC get_tree_by_slug
-- Design constraints from docs/plan.md:
--   - No photo column        (TASTE-D5)
--   - No deleted_at / tombstone, hard delete  (TASTE-E5)
--   - Anon viewer reads ONLY via security-definer RPC  (TASTE-E2)
--   - Server-side updated_at via trigger  (Q-A2)
--   - Server-side cleanup of parent_ids/spouse_ids on person delete
--     (defense in depth for hard-delete cascade — plan §Key Eng #10)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'person_gender') then
    create type public.person_gender as enum ('male', 'female', 'unknown');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- family_trees: top-level container, one per gia phả
create table if not exists public.family_trees (
  id              uuid         primary key default gen_random_uuid(),
  owner_id        uuid         not null references auth.users(id) on delete cascade,
  name            text         not null check (char_length(name) between 1 and 200),
  root_person_id  uuid,        -- nullable initially, set after first person inserted
  public_slug     text         not null unique check (char_length(public_slug) between 6 and 64),
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table  public.family_trees is 'One row per gia phả. Owner-only via RLS. Anon reads via RPC only.';
comment on column public.family_trees.public_slug is 'URL slug for /view/:slug; must be unguessable (nanoid ~10 chars).';

-- persons: nodes in the tree
create table if not exists public.persons (
  id               uuid              primary key default gen_random_uuid(),
  tree_id          uuid              not null references public.family_trees(id) on delete cascade,
  full_name        text              not null check (char_length(full_name) between 1 and 200),
  generation_name  text              check (generation_name is null or char_length(generation_name) <= 50),
  gender           public.person_gender not null default 'unknown',
  birth_date       text              check (birth_date is null or char_length(birth_date) <= 10),
  death_date       text              check (death_date is null or char_length(death_date) <= 10),
  birth_place      text              check (birth_place is null or char_length(birth_place) <= 200),
  notes            text              check (notes is null or char_length(notes) <= 4000),
  parent_ids       uuid[]            not null default '{}'::uuid[],
  spouse_ids       uuid[]            not null default '{}'::uuid[],
  generation       integer           not null default 0,
  created_at       timestamptz       not null default now(),
  updated_at       timestamptz       not null default now()
);

comment on table  public.persons is 'Nodes in a family tree. parent_ids/spouse_ids are arrays of person uuid (same tree).';
comment on column public.persons.birth_date is 'Free-form date: YYYY or YYYY-MM-DD (old records often have year only).';
comment on column public.persons.parent_ids is '0..2 parents, same tree. Validated client-side (Zod) + defense via trigger below.';

-- FK from family_trees.root_person_id → persons(id) added after persons exists
-- (circular FK, allowed because root_person_id is nullable).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'family_trees_root_person_id_fkey'
  ) then
    alter table public.family_trees
      add constraint family_trees_root_person_id_fkey
      foreign key (root_person_id) references public.persons(id) on delete set null;
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------
create index if not exists persons_tree_id_idx           on public.persons (tree_id);
create index if not exists persons_tree_id_generation_idx on public.persons (tree_id, generation);
create index if not exists family_trees_owner_id_idx     on public.family_trees (owner_id);
-- public_slug already has a unique index from the unique constraint.

-- ---------------------------------------------------------------------
-- 4. Triggers — updated_at auto-bump (Q-A2)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists family_trees_set_updated_at on public.family_trees;
create trigger family_trees_set_updated_at
  before update on public.family_trees
  for each row execute function public.set_updated_at();

drop trigger if exists persons_set_updated_at on public.persons;
create trigger persons_set_updated_at
  before update on public.persons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Triggers — cleanup references on person delete (plan §Key Eng #10)
-- ---------------------------------------------------------------------
-- When a person is hard-deleted, remove its id from parent_ids/spouse_ids
-- of all sibling rows in the SAME tree. Defense in depth: client already
-- does this optimistically, but server guarantees eventual consistency
-- even if the client crashes between its optimistic update and DB write.
create or replace function public.cleanup_person_refs()
returns trigger
language plpgsql
as $$
begin
  update public.persons
  set parent_ids = array_remove(parent_ids, old.id),
      spouse_ids = array_remove(spouse_ids, old.id)
  where tree_id = old.tree_id
    and (old.id = any(parent_ids) or old.id = any(spouse_ids));
  return old;
end;
$$;

drop trigger if exists persons_cleanup_refs on public.persons;
create trigger persons_cleanup_refs
  after delete on public.persons
  for each row execute function public.cleanup_person_refs();

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
alter table public.family_trees enable row level security;
alter table public.persons       enable row level security;

-- family_trees: owner-only full access
drop policy if exists "owner_all_family_trees" on public.family_trees;
create policy "owner_all_family_trees"
  on public.family_trees
  for all
  to authenticated
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- persons: owner-of-tree-only full access
drop policy if exists "owner_all_persons" on public.persons;
create policy "owner_all_persons"
  on public.persons
  for all
  to authenticated
  using (
    exists (
      select 1 from public.family_trees t
      where t.id = persons.tree_id
        and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.family_trees t
      where t.id = persons.tree_id
        and t.owner_id = auth.uid()
    )
  );

-- Anon has NO direct access to either table. Explicit revoke so future
-- GRANT ALL by mistake does not re-expose the tables.
revoke all on public.family_trees from anon;
revoke all on public.persons       from anon;

-- ---------------------------------------------------------------------
-- 7. RPC — get_tree_by_slug (TASTE-E2)
-- ---------------------------------------------------------------------
-- Security definer: runs as table owner, bypasses RLS inside the function,
-- so anon can read the PUBLIC slug's data without direct table grants.
-- Returns a single JSONB document: { tree: {...}, persons: [...] }.
-- Null if slug not found (client shows "Không tìm thấy gia phả").
create or replace function public.get_tree_by_slug(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'tree',    to_jsonb(t.*),
    'persons', coalesce(
      (
        select jsonb_agg(to_jsonb(p.*) order by p.generation, p.created_at)
        from public.persons p
        where p.tree_id = t.id
      ),
      '[]'::jsonb
    )
  )
  from public.family_trees t
  where t.public_slug = p_slug
  limit 1;
$$;

comment on function public.get_tree_by_slug(text) is
  'Public read endpoint for /view/:slug. Security definer bypasses RLS. Returns null if slug unknown.';

-- Only anon + authenticated can execute; no direct table grants.
revoke all on function public.get_tree_by_slug(text) from public;
grant execute on function public.get_tree_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Grants (explicit, no default public)
-- ---------------------------------------------------------------------
-- authenticated role needs table CRUD (RLS will still filter)
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.family_trees to authenticated;
grant select, insert, update, delete on public.persons       to authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
