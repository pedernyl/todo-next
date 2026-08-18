import type { SupabaseClient } from "@supabase/supabase-js";
import { queryWithTableFallback } from "../lib/tableCompatibility";

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
    await queryWithTableFallback(
      (tableName) => supabaseAdmin
        .from(tableName)
        .delete()
        .eq("id", ownerId),
      "Users",
      "User"
    );
  } catch (e) {
    // Ignore cleanup errors
  }
}


export async function createTestUser(
  supabaseAdmin: SupabaseClient, 
  id: number,
  email: string
): Promise<void> {
  await queryWithTableFallback(
    (tableName) => supabaseAdmin.from(tableName).insert({ id, email }),
    "Users",
    "User"
  );  
}

export async function deleteTestUser(
  supabaseAdmin: SupabaseClient, 
  id: number
): Promise<void> {
  await queryWithTableFallback(
    (tableName) => supabaseAdmin.from(tableName).delete().eq("id", id),
    "Users",
    "User"
  );  
}
