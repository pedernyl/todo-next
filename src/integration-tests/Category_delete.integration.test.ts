import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { cleanupTestOwnerData, createSupabaseAdminForIntegrationTests, createTestUser } from "./integrationTestHelpers";
import { createTodo } from "../lib/dataService";
import { createCategory } from "../lib/categoryService";
import { NextRequest } from "next/server";
import { DELETE } from "../app/api/categories/route";
import type { Category } from '../../types';
import { API_MESSAGES } from "@/constants/api/apiMessages";
import { API_PATHS } from "@/constants/api/apiPaths";

const TEST_OWNER_ID = 999003;
const TEST_OWNER_EMAIL = "category-delete-integration-test@example.com";

vi.mock('../lib/appServerSession', () => ({ 
  getAppServerSession: vi.fn(async () => ({
    user: { email: TEST_OWNER_EMAIL },
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

        category = await createCategory('categoryDeleteIntegrationTest', TEST_OWNER_ID);
        const todo = await createTodo({ 
            title: 'todoDeleteIntegrationTest', 
            description: 'Test description', 
            category_id: category.id 
        });
      
    });
    
    it("should not allow deletion of a category with active todos", async () => {
        if (!category) throw new Error("Category not created");

        const request = await new NextRequest(
          process.env.NEXT_PUBLIC_BASE_URL + API_PATHS.CATEGORIES,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: category.id }) 
          }
        );

        const response = await DELETE(request);
        
        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.error).toBe(
            API_MESSAGES.CATEGORIES.CATEGORY_HAS_ACTIVE_TODOS
        );
    });

    afterAll(async () => {
        const supabaseAdmin = createSupabaseAdminForIntegrationTests();
        await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
      });

});