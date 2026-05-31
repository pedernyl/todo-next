-- Run this in Supabase SQL editor to search for settings by key

CREATE OR REPLACE FUNCTION find_settings_by_key(search_key text)
RETURNS SETOF "Settings" AS $$
  SELECT * FROM "Settings"
  WHERE settings ? search_key;
$$ LANGUAGE sql;