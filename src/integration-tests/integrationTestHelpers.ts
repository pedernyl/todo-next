import { queryWithTableFallback } from "../lib/tableCompatibility";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/** Creates and caches an admin Supabase client for integration tests. */
export function createSupabaseAdminForIntegrationTests() {
  if (!createSupabaseAdminForIntegrationTests.client) {
    createSupabaseAdminForIntegrationTests.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_TEST_URL as string,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storageKey: "integration-test-admin-auth-token",
        },
      }
    );
  }
  return createSupabaseAdminForIntegrationTests.client;
}

createSupabaseAdminForIntegrationTests.client = null as SupabaseClient | null;

/** Inserts a test user into the available user table. */
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

/** Removes a test user from the available user table. */
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
