import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { cleanupTestOwnerData, createTestUser, createSupabaseAdminForIntegrationTests, doesSupabaseFunctionExist } from "./integrationTestHelpers";
import { createCategory } from "../lib/categoryService";
import { createTodo } from "../lib/dataService";
import { Category } from "../../types";

const TEST_OWNER_EMAIL = "category-query-integration-test@example.com";
const TEST_OWNER_ID = 779001;

let category: Category | null = null;

vi.mock('../lib/appServerSession', () => ({ 
  getAppServerSession: vi.fn(async () => ({
    user: { email: TEST_OWNER_EMAIL },
  })),
}));

 const supabaseAdmin = createSupabaseAdminForIntegrationTests();
 const functionExists = await doesSupabaseFunctionExist(
      supabaseAdmin, 
      "get_categories_with_has_active_todos", 
      { 
        p_owner_id: TEST_OWNER_ID, 
        p_completed: false, 
        p_deleted: false   
      }
    );

describe.skipIf(!functionExists)(
  "Category query integration tests (skipped if function does not exist)",
  () => {
      beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
    await createTestUser(supabaseAdmin, TEST_OWNER_ID, TEST_OWNER_EMAIL);
    category = await createCategory('categoryDeleteIntegrationTest', TEST_OWNER_ID);
    await createTodo({
      title: 'todoDeleteIntegrationTest',
      description: 'Test description',
      category_id: category.id
    });
  });

  afterAll(async () => {
    await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
  });

  it("should fetch category with active todos", async () => {
    if (!category) {
      throw new Error("Category was not created successfully");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "get_categories_with_has_active_todos",
      { 
        p_owner_id: TEST_OWNER_ID, 
        p_completed: false, 
        p_deleted: false,
        p_category_id: category.id
      }
    );
    if (error) {
      console.error('Error fetching categories with active todos:', error);
    }

    expect(data[0].has_active_todos).toBe(true);
  });
    
  }
);
