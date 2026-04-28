create or replace function public.rename_todos_table_to_todos_pascal()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
if to_regclass('public.todos') is not null
and to_regclass('public."Todos"') is null then
execute 'alter table public.todos rename to "Todos"';
end if;
end;
$$;

revoke all on function public.rename_todos_table_to_todos_pascal() from public;
revoke all on function public.rename_todos_table_to_todos_pascal() from anon;
revoke all on function public.rename_todos_table_to_todos_pascal() from authenticated;
grant execute on function public.rename_todos_table_to_todos_pascal() to service_role;
