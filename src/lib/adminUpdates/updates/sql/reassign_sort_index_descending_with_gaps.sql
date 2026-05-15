-- Reassigns sort_index for all todos to use descending order with gaps.
--
-- Before: sort_index starts at 0, increments upward; lower value = higher in list.
-- After:  sort_index starts at 1000, increments by 1000; higher value = higher in list.
--
-- Ordering within each owner is preserved:
--   whatever appeared first (lowest sort_index, then lowest id) gets the highest new value.
-- All todos are updated regardless of category_id, parent_todo, or completed status.
--
-- Deploy this function to Supabase, then run the admin update to execute it.

CREATE OR REPLACE FUNCTION public.reassign_sort_index_descending_with_gaps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tbl text;
BEGIN
  -- Support both table name variants (same pattern as insert_todo_at_top.sql)
  IF to_regclass('public."Todos"') IS NOT NULL THEN
    tbl := '"Todos"';
  ELSE
    tbl := 'todos';
  END IF;

  -- Assign new sort_index values per owner:
  --   row ranked 1 (currently at top) gets the highest new value,
  --   so we multiply the *reversed* rank by 1000.
  --   reversed_rank = total_rows_for_owner - rank + 1
  EXECUTE format(
    'UPDATE public.%1$s t
     SET sort_index = ranked.new_sort_index
     FROM (
       SELECT
         id,
         (COUNT(*) OVER (PARTITION BY owner_id)
           - ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY sort_index ASC, id ASC)
           + 1
         ) * 1000 AS new_sort_index
       FROM public.%1$s
     ) ranked
     WHERE t.id = ranked.id',
    tbl
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_sort_index_descending_with_gaps() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reassign_sort_index_descending_with_gaps() FROM anon;
REVOKE ALL ON FUNCTION public.reassign_sort_index_descending_with_gaps() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_sort_index_descending_with_gaps() TO service_role;
