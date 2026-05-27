import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Deletes todos by their exact titles. Silently ignores errors so a missing
 * row never causes cleanup to fail.
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
        console.log(`[cleanup] deleteTodosByTitle succeeded on ${tableName}`);
        break;
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
 * Deletes categories by their exact names. Silently ignores errors.
 */
export async function deleteCategoriesByName(
  db: SupabaseClient,
  names: string[]
): Promise<void> {
  if (names.length === 0) return;
  try {
    const { error } = await db.from('Category').delete().in('name', names);
    if (error) {
      console.error('[cleanup] deleteCategoriesByName failed on Category:', error.message);
    } else {
      console.log('[cleanup] deleteCategoriesByName succeeded on Category for names:', names);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('[cleanup] deleteCategoriesByName threw on Category:', error.message);
    } else {
      console.error('[cleanup] deleteCategoriesByName threw on Category:', String(error));
    }
  }
}
