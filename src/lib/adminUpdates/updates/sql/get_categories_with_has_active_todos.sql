-- Purpose:
-- Creates/replaces public.get_categories_with_has_active_todos(owner_id, completed, deleted)
-- and returns category rows for the owner with an extra computed field:
--   has_active_todos = true when the category has at least one todo in todos_compat
--   where completed = false and deleted_timestamp is null.
--
-- How to add this to the database:
-- Run this SQL directly in the Supabase SQL editor.
-- This function is not wired to a corresponding admin update module.
create or replace function public.get_categories_with_has_active_todos(
  p_owner_id bigint, p_completed boolean, p_deleted boolean default null 
  )
returns table (
  id bigint,
  created_at timestamp with time zone,
  title character varying,
  description text,
  deleted_timestamp timestamptz,
  deleted_by bigint,
  completed boolean,
  has_active_todos boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select
    c.id,
    c.created_at,
    c.title,
    c.description,
    c.deleted_timestamp,
    c.deleted_by,
    c.completed,
     exists (
      select 1
      from todos_compat t
      where t.category_id = c.id
        and t.completed = false
        and t.deleted_timestamp is null
    ) as has_active_todos
  from "Category" c
  where c.owner_id = p_owner_id
     and (
      c.completed = p_completed
      and 
      (p_deleted = false and c.deleted_timestamp is null)
      or
      (p_deleted = true and c.deleted_timestamp is not null)
    );
end;
$$;
