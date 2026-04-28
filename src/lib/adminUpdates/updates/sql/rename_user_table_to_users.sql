create or replace function public.rename_user_table_to_users()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
if to_regclass('public."User"') is not null
and to_regclass('public."Users"') is null then
execute 'alter table public."User" rename to "Users"';
end if;
end;
$$;

revoke all on function public.rename_user_table_to_users() from public;
revoke all on function public.rename_user_table_to_users() from anon;
revoke all on function public.rename_user_table_to_users() from authenticated;
grant execute on function public.rename_user_table_to_users() to service_role;