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
    await deleteTestTodos(supabaseAdmin, ownerId);
    await supabaseAdmin.from("Category").delete().eq("owner_id", ownerId);
    await deleteTestUser(supabaseAdmin, ownerId);
    
  } catch (e) {
    // Ignore cleanup errors
  }
}

export async function deleteTestTodos(
  supabaseAdmin: SupabaseClient,
  ownerId: number
): Promise<void> {
  await queryWithTableFallback(
    (tableName) => supabaseAdmin.from(tableName).delete().eq("owner_id", ownerId),
    "Todos",
    "todos"
  );
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
