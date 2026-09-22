import type { PostgrestError } from "@supabase/supabase-js";

type TableQueryResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};


/**
 * Decide whether a query should retry against the legacy table name during a
 * schema rename migration.
 *
 * This keeps mixed-version deployments working while a table is being renamed,
 * such as "User" -> "Users" or "todos" -> "Todos". Some environments may still
 * be using the legacy table while others have already moved to the new name.
 */
export function shouldFallbackToLegacyTable(
  error: PostgrestError | null,
  legacyTableName: string
): boolean {
  if (!error) return false;

  const code = (error.code ?? '').toUpperCase();
  const message = (error.message ?? '').toLowerCase();
  const lowerLegacyTableName = legacyTableName.toLowerCase();

  // PostgreSQL SQLSTATE 42P01 = undefined_table.
  // This is the canonical "table does not exist" response.
  if (code === '42P01') {
    return true;
  }

  // PostgREST can report schema-cache mismatches as PGRST205 after a table rename.
  // We only retry when the message specifically mentions the legacy table in the
  // public schema, which keeps the fallback narrow and safe.
  if (code === 'PGRST205') {
    return (
      message.includes(`public.${lowerLegacyTableName}`) ||
      message.includes(`public."${lowerLegacyTableName}"`)
    );
  }

  // Generic PostgreSQL text error, e.g.:
  // "relation \"public.User\" does not exist"
  return (
    message.includes('relation') &&
    message.includes(lowerLegacyTableName) &&
    message.includes('does not exist')
  );
}

/**
 * Run a query against the preferred table name and retry once against the legacy
 * name if the database indicates the table was renamed.
 */
export async function queryWithTableFallback<T>(
  queryFactory: (tableName: string) => PromiseLike<TableQueryResult<T>>,
  preferredTable: string,
  legacyTable: string
): Promise<TableQueryResult<T>> {
  const primaryResult = await queryFactory(preferredTable);

  if (!shouldFallbackToLegacyTable(primaryResult.error, legacyTable)) {
    return primaryResult;
  }

  return queryFactory(legacyTable);
}