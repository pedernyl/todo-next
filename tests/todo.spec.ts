
import { test, expect } from '@playwright/test';
import { createTestDbClient } from './helpers/dbClient';
import { deleteTodosByTitle, createTodo } from './helpers/cleanupHelpers';
import { ADD_TODO_IDS } from '@/constants/todo/AddTodo';
import { TODO_LIST_IDS } from '@/constants/todo/TodoList';

// Use authentication state for all tests in this file
test.use({ storageState: 'storageState.json' });
// Adjust the URL if your dev server runs on a different port
const BASE_URL = 'http://localhost:3000';
const title = 'Playwright Todo';
const completeTodoTitle = 'Playwright Complete Todo';

test.describe('Todo App E2E', () => {
  // Tracks all todo titles created during the test suite so they can be cleaned up in afterAll
  const createdTodoTitles: string[] = [];

  test.beforeAll(async ({ browser, baseURL }) => {
    // A dedicated browser context is created here (rather than using the test-scoped `page` fixture)
    // because beforeAll does not have access to page/request fixtures directly.
    // The context must include storageState so API requests are authenticated.
    const context = await browser.newContext({
      baseURL,
      storageState: 'storageState.json',
    });

    // Pre-create a todo via the API so it exists before any test runs;
    // creating it through the UI in beforeAll is unreliable across parallel workers.
    await createTodo(
      context.request,
      completeTodoTitle,
      'This todo will be completed in the test'
    );

    createdTodoTitles.push(completeTodoTitle);
  });

  test.afterAll(async () => {
    // Clean up all todos created during this suite to keep the test database tidy
    const db = createTestDbClient();
    await deleteTodosByTitle(db, createdTodoTitles);
  });

  test('should render markdown line breaks in description', async ({ page }) => {
    const title = `Playwright Line Break ${Date.now()}`;
    createdTodoTitles.push(title);
    await page.goto(BASE_URL);
    await page.getByTestId(TODO_LIST_IDS.TOGGLE_ADD_TODO_FORM.testId).click();
    await page.getByTestId(ADD_TODO_IDS.TITLE_INPUT).fill(title);
    await page.getByTestId(ADD_TODO_IDS.DESCRIPTION_INPUT).fill('first line\nsecond line');
    await page.getByTestId(ADD_TODO_IDS.SAVE_BUTTON).click();

    const todoItem = page.locator(`li:has-text("${title}")`).first();
    await expect(todoItem).toBeVisible();
    // Expand the description panel to make the rendered markdown visible
    await todoItem.getByTestId(new RegExp(`^${TODO_LIST_IDS.TOGGLE_DESCRIPTION.testId}-`)).click();

    // A single newline in the input should produce exactly one <br> in the rendered output
    await expect(todoItem.locator('.prose br')).toHaveCount(1);
    await expect(todoItem).toContainText('first line');
    await expect(todoItem).toContainText('second line');
  });

  test('should create a new todo', async ({ page }) => {
    createdTodoTitles.push(title);
    await page.goto(BASE_URL);
    await page.getByTestId(TODO_LIST_IDS.TOGGLE_ADD_TODO_FORM.testId).click();
    await page.getByTestId(ADD_TODO_IDS.TITLE_INPUT).fill(title);
    await page.getByTestId(ADD_TODO_IDS.DESCRIPTION_INPUT).fill('Created by Playwright');
    await page.getByTestId(ADD_TODO_IDS.SAVE_BUTTON).click();
    // Check that the new todo appears in the list
    await expect(page.locator(`text=${title}`)).toBeVisible();
  });

  test('should complete a todo', async ({ page }) => {
    await page.goto(BASE_URL);
    const todoItem = page.locator(`li:has-text("${completeTodoTitle}")`).first();
    await expect(todoItem).toBeVisible();
    // The complete button is only shown when the description panel is expanded
    await todoItem.getByTestId(new RegExp(`^${TODO_LIST_IDS.TOGGLE_DESCRIPTION.testId}-`)).click();
    const completedButton = todoItem.getByTestId(new RegExp(`^${TODO_LIST_IDS.TOGGLE_COMPLETE.testId}-`));
    await expect(completedButton).toBeVisible();
    await completedButton.click();
    const completedTodo = todoItem
      .getByTestId(
        new RegExp(`^${TODO_LIST_IDS.COMPLETED_TODO.completed}-`)
      );
    await expect(completedTodo).toBeVisible();
    await expect(completedTodo).toHaveCount(1);
  
  });

});
