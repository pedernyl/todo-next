import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Deletes todos by their exact titles.
 * Errors are logged for visibility, but cleanup does not throw.
 */
export async function deleteTodosByTitle(
  db: SupabaseClient,
  titles: string[]
): Promise<void> {
  if (titles.length === 0) return;
  // Primary table is "Todos". Lowercase "todos" is a deprecated fallback.
  // TODO: Remove lowercase fallback once all environments are verified on "Todos".
  for (const tableName of ['Todos', 'todos']) {
    try {
      // Supabase can return API/query failures in the response "error" field
      // without throwing, so we must check both return error and thrown errors.
      const { error } = await db.from(tableName).delete().in('title', titles);
      if (error) {
        const errorCode = (error as { code?: string }).code;
        const isTableMissing =
          errorCode === 'PGRST205' ||
          error.message.includes("Could not find the table");

        // Missing deprecated fallback table is expected in newer environments.
        if (!isTableMissing) {
          console.error(`[cleanup] deleteTodosByTitle failed on ${tableName}:`, error.message);
        }
      } else {
        break; // If delete succeeded on "Todos", no need to try "todos"
      }
    } catch (error) {
      // Network/runtime failures are thrown and must be handled separately.
      if (error instanceof Error) {
        console.error(`[cleanup] deleteTodosByTitle threw on ${tableName}:`, error.message);
      } else {
        console.error(`[cleanup] deleteTodosByTitle threw on ${tableName}:`, String(error));
      }
    }
  }
}

/**
 * Deletes categories by their exact titles.
 * Errors are logged for visibility, but cleanup does not throw.
 */
export async function deleteCategoriesByTitle(
  db: SupabaseClient,
  titles: string[]
): Promise<void> {
  if (titles.length === 0) return;
  try {
    const { error } = await db.from('Category').delete().in('title', titles);
    if (error) {
      console.error('[cleanup] deleteCategoriesByTitle failed on Category:', error.message);
    } 
  } catch (error) {
    if (error instanceof Error) {
      console.error('[cleanup] deleteCategoriesByTitle threw on Category:', error.message);
    } else {
      console.error('[cleanup] deleteCategoriesByTitle threw on Category:', String(error));
    }
  }
}

/** 
 * Fetch settings value from database before tests change this  
 */
export async function getSettingValue(
  db: SupabaseClient,
  key: string
): Promise<number | undefined | null> {
  if (key.length === 0) return;
  try {
   const { data, error } = await db
    .rpc('find_settings_by_key', { search_key: 'maxLoadLimit' });

    return data?.[0]?.settings ?? null;
   

  } catch (error) {
    if (error instanceof Error) {
      console.error('[cleanup] getSettingValue threw on ${key}:', error.message);
    } else {
      console.error('[cleanup] getSettingValue threw on ${key}:', String(error));
    }
  }
}




