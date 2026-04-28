-- Run this in Supabase SQL editor before executing
-- addUsersIsAdminAndSeedFromAllowedUsers_1777381562.ts.

create or replace function public.add_users_is_admin_column_if_missing()
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
      and table_name = 'Users'
      and column_name = 'isAdmin'
  ) then
    execute 'alter table public."Users" add column "isAdmin" boolean not null default false';
  end if;
end;
$$;

grant execute on function public.add_users_is_admin_column_if_missing() to service_role;

-- Seeds isAdmin=true for each email in the provided array (case-insensitive).
-- Must be run AFTER add_users_is_admin_column_if_missing() has been called.
create or replace function public.seed_admin_users_by_email(emails text[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  seeded int;
begin
  update public."Users"
  set "isAdmin" = true
  where lower(email) in (select lower(unnest(emails)));
  get diagnostics seeded = row_count;
  return seeded;
end;
$$;

grant execute on function public.seed_admin_users_by_email(text[]) to service_role;
