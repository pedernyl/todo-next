import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { 
    cleanupTestOwnerData, 
    createSupabaseAdminForIntegrationTests, 
    createTestUser,
    getTodosByCategoryId,
 } from "./integrationTestHelpers";
 import { createTodo } from "../lib/dataService";
import { createCategory, getCategoryById, toggleCategoryCompletion } from "../lib/categoryService";
import type { Category, Todo } from '../../types';


const TEST_OWNER_ID = 999555;
const TEST_OWNER_EMAIL = "category-toggle-complete-integration-test@example.com";

vi.mock('../lib/appServerSession', () => ({ 
  getAppServerSession: vi.fn(async () => ({
    user: { email: TEST_OWNER_EMAIL, id: TEST_OWNER_ID },
  })),
}));

type TodoInput = Pick<Todo, 'title' | 'description' | 'category_id' | 'owner_id'>;

const todos: Array<TodoInput> = [{
    title: 'todoCategoryToggleCompleteTest1', 
    description: 'Test description', 
    category_id: null, // Placeholder, will be updated in beforeAll
    owner_id: TEST_OWNER_ID 
  },
  {
    title: 'todoCategoryToggleCompleteTest2', 
    description: 'Test description', 
    category_id: null, // Placeholder, will be updated in beforeAll
    owner_id: TEST_OWNER_ID 
  },
];

const supabaseAdmin = createSupabaseAdminForIntegrationTests();

describe("Category toggle complete integration test", () => {
    
    let category: Category;
   
    beforeAll(async () => {
          assertIntegrationTestDbEnvIsActive();
                if (!process.env.NEXT_PUBLIC_BASE_URL) {
                      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
                }
                
                // Clean up any leftover test data before starting
                await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
        
                await createTestUser(supabaseAdmin, TEST_OWNER_ID, TEST_OWNER_EMAIL);
        
                category = await createCategory('categoryDeleteIntegrationTest', TEST_OWNER_ID);

                // Create todos for the test
                for (const todo of todos) {
                    await createTodo({ 
                        ...todo,
                        category_id: category.id 
                    });
                }

    });

      afterAll(async () => {
            await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
      });

    it.each([
        { completed: true },
        { completed: false }
    ])
    ('category completion status should be reflected correctly when completed=$completed', async ({ completed }) => {
        await toggleCategoryCompletion({
            categoryId: Number(category.id),
            ownerId: TEST_OWNER_ID,
            completed
        });

        const updatedCategory = await getCategoryById({
            categoryId: Number(category.id),
            ownerId: TEST_OWNER_ID,
            completed,
            deleted: false
        });

        expect(updatedCategory?.completed).toBe(completed);

        const todosAfterToggle = await getTodosByCategoryId({
            supabaseAdmin,
            categoryId: Number(category.id)
        });

        expect(todosAfterToggle.every(
            todo => todo.completed === completed))
            .toBe(true);
        expect(todosAfterToggle.length).toBe(todos.length);
    });
});