-- =====================================================================
-- DEV SEED — optional, for local smoke testing
-- Usage: open SQL editor in Supabase dashboard, replace <YOUR_USER_ID>
--        with a real auth.users.id (create one via /login flow first),
--        then run. Do NOT run this in production.
-- =====================================================================

-- 1. A gia phả owned by the specified user
with t as (
  insert into public.family_trees (owner_id, name, public_slug)
  values (
    '<YOUR_USER_ID>'::uuid,
    'Gia phả họ Nguyễn làng Hải An (dev)',
    'demo-hai-an-01'
  )
  returning id
),
-- 2. Root person (cụ Tổ)
root as (
  insert into public.persons (tree_id, full_name, generation_name, gender, birth_date, generation)
  select t.id, 'Nguyễn Văn Tổ', 'Văn', 'male', '1880', 0
  from t
  returning id, tree_id
),
-- 3. Root's wife
wife as (
  insert into public.persons (tree_id, full_name, generation_name, gender, birth_date, generation, spouse_ids)
  select r.tree_id, 'Trần Thị Lan', 'Thị', 'female', '1885', 0, array[r.id]
  from root r
  returning id, tree_id
),
-- 4. Link the wife back to the root's spouse_ids
_update_root_spouse as (
  update public.persons p
  set spouse_ids = array[w.id]
  from wife w
  where p.id = (select id from root)
  returning p.id
),
-- 5. Child of root + wife (đời 1)
child as (
  insert into public.persons (tree_id, full_name, generation_name, gender, birth_date, generation, parent_ids)
  select r.tree_id, 'Nguyễn Văn An', 'Văn', 'male', '1910', 1,
         array[r.id, (select id from wife)]
  from root r
  returning id
)
-- 6. Set the tree's root_person_id
update public.family_trees
set root_person_id = (select id from root)
where id = (select id from t);
