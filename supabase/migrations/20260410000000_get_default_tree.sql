-- Return the first (and typically only) public tree.
-- Same shape as get_tree_by_slug so the client can reuse PublicTreePayload.
-- Security definer: bypasses RLS so anon can read.

create or replace function public.get_default_tree()
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
  order by t.created_at asc
  limit 1;
$$;

revoke all on function public.get_default_tree() from public;
grant execute on function public.get_default_tree() to anon, authenticated;
