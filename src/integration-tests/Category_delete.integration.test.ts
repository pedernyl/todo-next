import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { cleanupTestOwnerData, createSupabaseAdminForIntegrationTests, createTestUser } from "./integrationTestHelpers";
import { createTodo } from "../lib/dataService";
import { createCategory, deleteCategory } from "../lib/categoryService";
import type { Category } from '../../types';

const TEST_OWNER_ID = 999003;
const TEST_OWNER_EMAIL = "category-delete-integration-test@example.com";

vi.mock('../lib/appServerSession', () => ({ 
  getAppServerSession: vi.fn(async () => ({
    user: { 
      email: TEST_OWNER_EMAIL,
      id: TEST_OWNER_ID,
    },
  })),
}));

describe("Category deletion integration test", () => {
    let category: Category | null = null;
    beforeAll(async () => {
        assertIntegrationTestDbEnvIsActive();
        if (!process.env.NEXT_PUBLIC_BASE_URL) {
              process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
        }
        
        const supabaseAdmin = createSupabaseAdminForIntegrationTests();

        // Clean up any leftover test data before starting
        await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);

        await createTestUser(supabaseAdmin, TEST_OWNER_ID, TEST_OWNER_EMAIL);

        // we need to mock the app server session to simulate the logged-in user

        category = await createCategory('categoryDeleteIntegrationTest');
        await createTodo({ 
            title: 'todoDeleteIntegrationTest', 
            description: 'Test description', 
            category_id: category.id 
        });
      
    });

    it("Should return error when sending an non numeric category id", async () => {
        //@ts-expect-error TS is complaining because deleteCategory expects a number, but we're intentionally passing a string to test error handling.
        const result = await deleteCategory("non-numeric-id");
        
        if (result.success) {
          throw new Error("Expected deletion to fail for non-numeric category ID");
        }

        
        expect(result.error).toBe('Invalid category ID');
    });
    
    it("should not allow deletion of a category with active todos", async () => {
        if (!category) throw new Error("Category not created");

        const result = await deleteCategory(Number(category.id));
        
        if (result.success) {
          throw new Error("Expected deletion to fail for category with active todos");
        }

        expect(result.error).toBe('Category has active todos');
    });

    afterAll(async () => {
        const supabaseAdmin = createSupabaseAdminForIntegrationTests();
        await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
      });

});