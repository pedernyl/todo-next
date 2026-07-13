-- Purpose:
-- Creates/replaces public.todos_compat as a compatibility view that points to
-- whichever todos table exists in this database:
--   - public."Todos" (PascalCase legacy name), or
--   - public.todos (lowercase name).
--
-- How to add this to the database:
-- Run this SQL directly in the Supabase SQL editor.
--
-- Important dependency:
-- Create this view before creating public.get_categories_with_has_active_todos,
-- because that function reads from public.todos_compat.
do $$
begin
  if to_regclass('public."Todos"') is not null then
    execute 'create or replace view public.todos_compat as select * from public."Todos"';
  elsif to_regclass('public.todos') is not null then
    execute 'create or replace view public.todos_compat as select * from public.todos';
  else
    raise exception 'No todos-table could be found (neither "Todos" or todos)';
  end if;
end $$;