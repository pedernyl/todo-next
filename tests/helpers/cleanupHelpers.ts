import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminSettingsDefinition, FindSettingsByKeyResult } from '@/lib/adminSettings/types';
import { readFile } from 'fs/promises';
import { parseAdminSettingsDefinitionYaml } from '@/lib/adminSettings/loader';


/**
 * Deletes todos by their exact titles.
 * Errors are logged for visibility, but cleanup does not throw.
 * 
 * @param db Supabase client instance
 * @param titles Array of todo titles to delete
 * @returns void  
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
 * 
 * @param db Supabase client instance
 * @param titles Array of category titles to delete
 * @returns void  
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
 * Fetch settings value from database 
 * 
 * @param db Supabase client instance
 * @param key 
 * @returns FindSettingsByKeyResult | undefined 
 */
export async function getSettingValue(
  db: SupabaseClient,
  key: string
): Promise<FindSettingsByKeyResult | undefined> {
  if (key.length === 0) return undefined;
  try {
   const { data, error } = await db
    .rpc('find_settings_by_key', { search_key: key });

    return data;
   

  } catch (error) {
    if (error instanceof Error) {
      console.error('[cleanup] getSettingValue threw on ${key}:', error.message);
    } else {
      console.error('[cleanup] getSettingValue threw on ${key}:', String(error));
    }
  }
}

/**
 * Get AdminSettingsDefinition from yaml file. 
 * @param fileName 
 * @returns AdminSettingsDefinition 
 *
 */
export async function getAdminSettingsFromYamlFile(
  fileName: string
): Promise<AdminSettingsDefinition> {
  const rawYaml = await readFile(fileName, "utf-8");
  return parseAdminSettingsDefinitionYaml(rawYaml, fileName);
}

/**
 * Write setting value back to database
 * 
 * @param db Supabase client instance
 * @param settings 
 * @param id 
 * @returns void
 */
export async function setSettingValue(
  db: SupabaseClient,
  settings: Record<string, unknown> | null,
  id: number
): Promise<void> {
  if (id <= 0) return;
  try {
   const { data, error } = await db
    .from('Settings')
    .update({ settings: settings })
    .eq('id', id); 

    if (error) {
      console.error('[cleanup] setSettingValue failed on ${key}:', error.message);
    }
   
  } catch (error) {
    if (error instanceof Error) {
      console.error('[cleanup] setSettingValue threw on ${key}:', error.message);
    } else {
      console.error('[cleanup] setSettingValue threw on ${key}:', String(error));
    }
  }
}




