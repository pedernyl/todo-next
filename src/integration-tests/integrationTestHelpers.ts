import { queryWithTableFallback } from "../lib/tableCompatibility";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Category, Todo } from "../../types";

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
    
  } catch(e) {
      console.warn('Error cleaning up test owner data:', e);
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

// Check if supabase function exists
export async function doesSupabaseFunctionExist(
  supabaseAdmin: SupabaseClient,
  functionName: string,
  params: Record<string, unknown> = {}
): Promise<boolean> {
  
    const { error } = 
      await supabaseAdmin.rpc(
        functionName, 
        params 
      );
    if (error?.code === 'PGRST202') {
      console.log('error', error);
      return false;
    }
    
    return true;
}

type CreateTestCategoryParams = {
  supabaseAdmin: SupabaseClient;
  ownerId: number;
  title: string;
  completed?: boolean;
  deleted?: boolean;
};
// Create test category - we need to set completed and deleted with params 
export async function createTestCategory({
  supabaseAdmin,
  ownerId,
  title,
  completed = false,
  deleted = false
}: CreateTestCategoryParams): Promise<Category> {
  let deletedTimestamp: string | null = null;
  let deletedBy: number | null = null;
  if (deleted === true) {
    deletedTimestamp = new Date().toISOString();
    deletedBy = ownerId;
  }
  const { data, error } = await supabaseAdmin
     .from("Category")
     .insert({ owner_id: ownerId, title: title, completed, deleted_timestamp: deletedTimestamp, deleted_by: deletedBy })
     .select()
     .single();

  if (error) {
    console.error('Error creating test category:', error);
    throw error;
  }

  data.has_active_todos = false; // Newly created categories won't have active todos
  return data as Category;
}

export async function getTodosByCategoryIdForTests({
  supabaseAdmin,
  categoryId
  }: {
  supabaseAdmin: SupabaseClient,
  categoryId: number
}): Promise<Todo[]> {
   const { data, error } = await queryWithTableFallback(
     (tableName) => supabaseAdmin.from(tableName).select("*").eq("category_id", categoryId),
     "Todos",
     "todos"
   );

   if (error) {
     console.error('Error fetching todos by category ID:', error);
     return [];
   }

   return data as Todo[];
}

// We return the updated category after applying the updates - just for convenience in tests
export async function updateCategoryForTests(ownerId: number, categoryId: number, updates: Partial<Category>): Promise<Category> {
  const { data, error } = await createSupabaseAdminForIntegrationTests()
     .from("Category")
     .update(updates)
     .eq("id", categoryId)
     .eq("owner_id", ownerId)
     .select()
     .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data as Category;
}

export async function getCategoryByIdForTests({
  supabaseAdmin,
  categoryId
}: {
  supabaseAdmin: SupabaseClient,
  categoryId: number
}): Promise<Category | null> {
    const { data, error } = await supabaseAdmin
     .from("Category")
     .select("*")
     .eq("id", categoryId)
     .single();

     if (data) {
      return data as Category;
    }

    if (error) {
      console.error('Error fetching category by ID:', error);
    }
  

  return null;
}
