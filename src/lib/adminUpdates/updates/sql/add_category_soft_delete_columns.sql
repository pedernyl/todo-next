create or replace function public.add_category_soft_delete_columns_if_missing()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'deleted_timestamp'
  ) then
    execute 'alter table public."Category" add column deleted_timestamp bigint';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'deleted_by'
  ) then
    execute 'alter table public."Category" add column deleted_by bigint references public."Users"(id)';
  end if;
end;
$$;

grant execute on function public.add_category_soft_delete_columns_if_missing() to service_role;