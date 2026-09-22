import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { 
    cleanupTestOwnerData, 
    createSupabaseAdminForIntegrationTests, 
    createTestUser,
    getTodosByCategoryIdForTests,
    updateCategoryForTests,
    getCategoryByIdForTests,
 } from "./integrationTestHelpers";
 import { createTodo } from "../lib/dataService";
import { createCategory, getCategoryById, updateCategoryCompletion } from "../lib/categoryService";
import type { Category, Todo } from '../../types';


const TEST_OWNER_ID = 999555;
const TEST_OWNER_EMAIL = "category-toggle-complete-integration-test@example.com";

const TEST_OWNER_ID_2 = 888444;
const TEST_OWNER_EMAIL_2 = "category-toggle-complete-integration-test-2@example.com";

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
                await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID_2);
                
                await createTestUser(supabaseAdmin, TEST_OWNER_ID, TEST_OWNER_EMAIL);

                await createTestUser(supabaseAdmin, TEST_OWNER_ID_2, TEST_OWNER_EMAIL_2);
        
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
            await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID_2);
      });

    it.each([
        { completed: true },
        { completed: false }
    ])
    ('category completion status should be reflected correctly when completed=$completed', async ({ completed }) => {
        await updateCategoryCompletion({
            categoryId: Number(category.id),
            completed
        });

        const updatedCategory = await getCategoryById({
            categoryId: Number(category.id),
            ownerId: TEST_OWNER_ID,
            completed,
            deleted: false
        });

        expect(updatedCategory?.completed).toBe(completed);

        const todosAfterToggle = await getTodosByCategoryIdForTests({
            supabaseAdmin,
            categoryId: Number(category.id)
        });

        expect(todosAfterToggle.every(
            todo => todo.completed === completed))
            .toBe(true);
            
        expect(todosAfterToggle.length).toBe(todos.length);
    });

    it('database function shall not update todos completion status if category does not exist for the current user', 
        async () => {
        // First change existing ownership for category
        const categoryUpdatedWithNewOwnerId = await updateCategoryForTests(
            TEST_OWNER_ID, 
            Number(category.id), 
            { owner_id: TEST_OWNER_ID_2 }
        );
        
        const newCompleteStatus = !categoryUpdatedWithNewOwnerId.completed;
        const originalCompleteStatus = categoryUpdatedWithNewOwnerId.completed;
        const nrOfTodosBefore = todos.length;

        // Execute the toggleCategoryCompletion function with wrong ownership
        await expect(
            updateCategoryCompletion({
                categoryId: Number(category.id),
                completed: newCompleteStatus
            })
        ).rejects.toThrow();

        const updatedCategoryAfterFailedCompleteUpdate = await getCategoryByIdForTests({
            supabaseAdmin,
            categoryId: Number(category.id)
        });

        expect(updatedCategoryAfterFailedCompleteUpdate?.completed).toBe(originalCompleteStatus);

        // Check that no todos completed status being changed. 
        const todosAfterFailedToggle = await getTodosByCategoryIdForTests({
            supabaseAdmin,
            categoryId: Number(category.id)
        });

        // assuming initial todos has same status as the unchanged category
        expect(todosAfterFailedToggle.every(
            todo => todo.completed === originalCompleteStatus)) 
            .toBe(true);

        expect(todosAfterFailedToggle.length).toBe(nrOfTodosBefore);
    });

    
});