-- Replaces insert_todo_at_top to append new todos using owner-wide max(sort_index) + 1000.
-- Deploy this function to Supabase, then run replaceInsertTodoAtTop_1778661608.ts.

CREATE OR REPLACE FUNCTION public.replace_insert_todo_at_top()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CREATE OR REPLACE FUNCTION public.insert_todo_at_top(
    p_title       text,
    p_description text,
    p_owner_id    bigint,
    p_parent_todo bigint DEFAULT NULL,
    p_category_id bigint DEFAULT NULL
  )
  RETURNS json
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $inner$
  DECLARE
    tbl text;
    v_row record;
    v_next_sort_index integer;
  BEGIN
    -- Support both table name variants
    IF to_regclass('public."Todos"') IS NOT NULL THEN
      tbl := '"Todos"';
    ELSE
      tbl := 'todos';
    END IF;

    -- Assign next sort_index across all todos for this owner.
    EXECUTE format(
      'SELECT COALESCE(MAX(sort_index), 0) + 1000
       FROM public.%s
       WHERE owner_id = $1 
        AND deleted_timestamp IS NULL',
      tbl
    ) INTO v_next_sort_index
      USING p_owner_id;

    -- Insert the new todo and return the full row
    EXECUTE format(
      'INSERT INTO public.%s
         (title, description, owner_id, completed, sort_index, parent_todo, category_id)
       VALUES ($1, $2, $3, false, $4, $5, $6)
       RETURNING *',
      tbl
    ) INTO v_row
      USING p_title, p_description, p_owner_id, v_next_sort_index, p_parent_todo, p_category_id;

    RETURN row_to_json(v_row);
  END;
  $inner$;

  GRANT EXECUTE ON FUNCTION public.insert_todo_at_top(text, text, bigint, bigint, bigint)
    TO anon, authenticated, service_role;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_insert_todo_at_top() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_insert_todo_at_top() FROM anon;
REVOKE ALL ON FUNCTION public.replace_insert_todo_at_top() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_insert_todo_at_top() TO service_role;