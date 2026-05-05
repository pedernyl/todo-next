import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deletes all test data owned by `ownerId` from the todos, Category, and Users
 * tables.  Safe to call multiple times; errors are silently swallowed so a
 * missing table or row never blocks test setup.
 */
export async function cleanupTestOwnerData(
  supabaseAdmin: SupabaseClient,
  ownerId: number
): Promise<void> {
  try {
    for (const tableName of ["Todos", "todos"]) {
      await supabaseAdmin.from(tableName).delete().eq("owner_id", ownerId);
    }
    await supabaseAdmin.from("Category").delete().eq("owner_id", ownerId);
    await supabaseAdmin.from("Users").delete().eq("id", ownerId);
  } catch (e) {
    // Ignore cleanup errors
  }
}
