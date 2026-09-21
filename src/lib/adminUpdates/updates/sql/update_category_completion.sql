create or replace function public.update_category_completion(
  p_category_id bigint,
  p_owner_id bigint,
  p_completed boolean
)
returns setof public."Category"
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_category_rows int;
begin
  update public."Category"
  set completed = p_completed
  where id = p_category_id
    and owner_id = p_owner_id;

  get diagnostics v_category_rows = row_count;

  if v_category_rows = 0 then
    raise exception 'Category % not found for owner %', p_category_id, p_owner_id;
  end if;

  update public.todos_compat
  set completed = p_completed
  where category_id = p_category_id
    and owner_id = p_owner_id;

  return query
  select * from public."Category"
  where id = p_category_id
    and owner_id = p_owner_id;
end;
$$;