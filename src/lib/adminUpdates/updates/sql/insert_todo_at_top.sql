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
AS $$
DECLARE
  tbl text;
  v_row record;
BEGIN
  -- Support both table name variants
  IF to_regclass('public."Todos"') IS NOT NULL THEN
    tbl := '"Todos"';
  ELSE
    tbl := 'todos';
  END IF;

  -- Shift all valid siblings up by 1 in one UPDATE.
  -- Skips null and negative sort_index (sentinel values) to avoid overflow.
  -- Scoping rules:
  --   subtodos  → same parent_todo + category_id
  --   top-level → same category_id (null or specific)
  EXECUTE format(
    'UPDATE public.%s
     SET sort_index = sort_index + 1
     WHERE owner_id        = $1
       AND deleted_timestamp IS NULL
       AND completed        = false
       AND sort_index      >= 0
       AND parent_todo     IS NOT DISTINCT FROM $2
       AND category_id     IS NOT DISTINCT FROM $3',
    tbl
  ) USING p_owner_id, p_parent_todo, p_category_id;

  -- Insert the new todo at sort_index = 0 and return the full row
  EXECUTE format(
    'INSERT INTO public.%s
       (title, description, owner_id, completed, sort_index, parent_todo, category_id)
     VALUES ($1, $2, $3, false, 0, $4, $5)
     RETURNING *',
    tbl
  ) INTO v_row
    USING p_title, p_description, p_owner_id, p_parent_todo, p_category_id;

  RETURN row_to_json(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_todo_at_top(text, text, bigint, bigint, bigint)
  TO anon, authenticated, service_role;