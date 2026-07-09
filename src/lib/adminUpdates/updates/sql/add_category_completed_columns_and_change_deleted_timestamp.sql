-- Run this in Supabase SQL editor before executing
-- add_category_completed_columns_and_change_deleted_timestamp_1783497399.ts
-- The sp name uses a short for "timestamp" to avoid hitting the 63 character limit for function names in Postgres.
create or replace function public.add_category_completed_columns_and_change_deleted_ts_if_missing()
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
    execute 'alter table public."Category" add column deleted_timestamp timestamptz';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'deleted_timestamp'
      and data_type = 'bigint'
  ) then
    execute '
      alter table public."Category"
      alter column deleted_timestamp type timestamptz
      using (
        case
          when deleted_timestamp is null then null
          else to_timestamp(deleted_timestamp)
        end
      )
    ';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'deleted_timestamp'
      and data_type = 'timestamp without time zone'
  ) then
    execute '
      alter table public."Category"
      alter column deleted_timestamp type timestamptz
      using deleted_timestamp at time zone ''UTC''
    ';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'completed'
  ) then
    execute 'alter table public."Category" add column completed boolean';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'completed_by'
  ) then
    execute 'alter table public."Category" add column completed_by bigint references public."Users"(id)';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'completed_timestamp'
  ) then
    execute 'alter table public."Category" add column completed_timestamp timestamptz';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Category'
      and column_name = 'completed_timestamp'
      and data_type = 'timestamp without time zone'
  ) then
    execute '
      alter table public."Category"
      alter column completed_timestamp type timestamptz
      using completed_timestamp at time zone ''UTC''
    ';
  end if;
end;
$$;

revoke all on function public.add_category_completed_columns_and_change_deleted_ts_if_missing() from public;
revoke all on function public.add_category_completed_columns_and_change_deleted_ts_if_missing() from anon;
revoke all on function public.add_category_completed_columns_and_change_deleted_ts_if_missing() from authenticated;

grant execute on function public.add_category_completed_columns_and_change_deleted_ts_if_missing() to service_role;
