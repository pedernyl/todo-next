create or replace function public.toggle_category_completion(
  p_category_id bigint,
  p_owner_id bigint,
  p_completed boolean
)
returns setof public."Category"
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.todos_compat
  set completed = p_completed
  where category_id = p_category_id
    and owner_id = p_owner_id;

  return query
  update public."Category"
  set completed = p_completed
  where id = p_category_id
    and owner_id = p_owner_id
  returning *;
end;
$$;

revoke all on function public.toggle_category_completion(bigint, bigint, boolean)
from public, anon, authenticated;

grant execute on function public.toggle_category_completion(bigint, bigint, boolean)
to service_role;