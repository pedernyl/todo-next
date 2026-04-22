import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
test.use({ storageState: 'storageState.json' });

async function createCategory(page: import('@playwright/test').Page, categoryName: string) {
	// Wait for categories/user context to be initialized.
	await page.waitForFunction(() => {
		const select = document.querySelector('select');
		return Boolean(select && select.options.length >= 3);
	}, { timeout: 15000 });
	await page.selectOption('select', '__create__');
	await page.fill('input[placeholder="New category name"]', categoryName);
	await page.fill('textarea[placeholder="Description (optional)"]', `Created by Playwright: ${categoryName}`);
	await page.click('button:has-text("Create")');
	await expect(page.locator(`select option:has-text("${categoryName}")`)).toHaveCount(1, { timeout: 15000 });
	await page.selectOption('select', { label: categoryName });
	await expect(page.locator('select')).toHaveValue(/^(?!__create__$).+/);
}

async function createTodo(page: import('@playwright/test').Page, title: string, description: string) {
	const addTodoButton = page.getByRole('button', { name: 'Add Todo', exact: true });
	if (await addTodoButton.isVisible()) {
		await addTodoButton.click();
	}
	await page.fill('input[name="title"]', title);
	await page.fill('textarea[name="description"]', description);
	await Promise.all([
		page.waitForResponse((res) => res.url().includes('/api/todos') && res.request().method() === 'POST' && res.ok()),
		page.click('button:has-text("Save Todo")'),
	]);
	await expect(page.locator(`li:has-text("${title}")`)).toBeVisible();
}

test.describe('Category E2E', () => {
	test('shows only todos for the selected category', async ({ page }) => {
		const seed = Date.now();
		const categoryA = `PW Category A ${seed}`;
		const categoryB = `PW Category B ${seed}`;
		const todoA = `PW Todo in A ${seed}`;
		const todoB = `PW Todo in B ${seed}`;

		await page.goto(BASE_URL);

		await createCategory(page, categoryA);
		await createTodo(page, todoA, 'belongs to A');

		await createCategory(page, categoryB);
		await createTodo(page, todoB, 'belongs to B');

		await page.selectOption('select', { label: categoryA });
		await expect(page.locator(`li:has-text("${todoA}")`)).toBeVisible();
		await expect(page.locator(`li:has-text("${todoB}")`)).toHaveCount(0);

		await page.selectOption('select', { label: categoryB });
		await expect(page.locator(`li:has-text("${todoB}")`)).toBeVisible();
		await expect(page.locator(`li:has-text("${todoA}")`)).toHaveCount(0);
	});
});
