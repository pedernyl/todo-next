
import { test, expect } from '@playwright/test';

// Use authentication state for all tests in this file
test.use({ storageState: 'storageState.json' });
// Adjust the URL if your dev server runs on a different port
const BASE_URL = 'http://localhost:3000';

test.describe('Todo App E2E', () => {
  test('should render markdown line breaks in description', async ({ page }) => {
    const title = `Playwright Line Break ${Date.now()}`;
    await page.goto(BASE_URL);
    await page.click('text=Add Todo');
    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', 'first line\nsecond line');
    await page.click('button:has-text("Save Todo")');

    const todoItem = page.locator(`li:has-text("${title}")`).first();
    await expect(todoItem).toBeVisible();
    await todoItem.getByText('Show Description').click();

    await expect(todoItem.locator('.prose br')).toHaveCount(1);
    await expect(todoItem).toContainText('first line');
    await expect(todoItem).toContainText('second line');
  });

  test('should create a new todo', async ({ page }) => {
    await page.goto(BASE_URL);
    // Click 'Add Todo' link to reveal the form
    await page.click('text=Add Todo');
    // Now click the 'Add Todo' button if needed (remove if not present)
    // await page.click('button:has-text("Add Todo")');
    // Fill in the title and description
    await page.fill('input[name="title"]', 'Playwright Todo');
    await page.fill('textarea[name="description"]', 'Created by Playwright');
  // Submit the form
  await page.click('button:has-text("Save Todo")');
    // Check that the new todo appears in the list
    await expect(page.locator('text=Playwright Todo')).toBeVisible();
  });

  test('should complete a todo', async ({ page }) => {
    await page.goto(BASE_URL);
    const todoItem = page.locator('li:has-text("Playwright Todo")').first();
    await expect(todoItem).toBeVisible();
    // Click 'Show Description' within this todo
    await todoItem.getByText('Show Description').click();
    await page.waitForTimeout(300);
    // Click the Complete button
    await todoItem.getByRole('button', { name: /complete/i }).click();
    await page.waitForTimeout(300);
    // Check that the todo is now marked as completed (line-through style)
    const title = todoItem.locator('span');
    await expect(title).toHaveClass(/line-through/);
  });

  // test('should delete a todo', async ({ page }) => {
  //   await page.goto(BASE_URL);
  //   // Find the todo by text and click its delete button (adjust selector as needed)
  //   const todo = page.locator('text=Playwright Todo');
  //   await expect(todo).toBeVisible();
  //   // Click the delete button (adjust selector to match your UI)
  //   await todo.locator('button[aria-label="Delete"]').click();
  //   // Confirm deletion if prompted
  //   // await page.click('button:has-text("Confirm")'); // Uncomment if you have a confirm dialog
  //   // Check that the todo is gone
  //   await expect(page.locator('text=Playwright Todo')).not.toBeVisible();
  // });
});
