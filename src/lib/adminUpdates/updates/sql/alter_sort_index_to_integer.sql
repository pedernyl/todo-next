-- Alters sort_index column from smallint to integer to support larger gap values.
-- This allows for gaps of 1000 between sort_index values without overflow,
-- supporting thousands of todos per user.
--
-- Deploy this function to Supabase, then run the admin update to execute it.

CREATE OR REPLACE FUNCTION public.alter_sort_index_to_integer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Support both table name variants
  IF to_regclass('public."Todos"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."Todos" ALTER COLUMN sort_index TYPE integer;';
  ELSIF to_regclass('public.todos') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.todos ALTER COLUMN sort_index TYPE integer;';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.alter_sort_index_to_integer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alter_sort_index_to_integer() FROM anon;
REVOKE ALL ON FUNCTION public.alter_sort_index_to_integer() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.alter_sort_index_to_integer() TO service_role;
