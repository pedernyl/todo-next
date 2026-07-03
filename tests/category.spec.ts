import { test, expect } from '@playwright/test';
import { createTestDbClient } from './helpers/dbClient';
import { deleteTodosByTitle, deleteCategoriesByTitle } from './helpers/cleanupHelpers';
import { API_PATHS } from '@/constants/api/apiPaths';
import { CATEGORY_DROPDOWN_IDS, DROPDOWN_OPTIONS } from '@/constants/dropdowns/categoryDropDown';
import { ADD_TODO_IDS } from '@/constants/todo/AddTodo';
import { TODO_LIST_IDS } from '@/constants/todo/TodoList';

const BASE_URL = 'http://localhost:3000';
test.use({ storageState: 'storageState.json' });

async function createCategory(page: import('@playwright/test').Page, categoryName: string) {
	const categorySelect = page.getByTestId(CATEGORY_DROPDOWN_IDS.SELECT);
	await expect(categorySelect).toBeVisible();
	await categorySelect.selectOption(DROPDOWN_OPTIONS.CREATE_CATEGORY.value);
	await page.getByTestId(CATEGORY_DROPDOWN_IDS.NEW_CATEGORY_INPUT).fill(categoryName);
	await page.getByTestId(CATEGORY_DROPDOWN_IDS.NEW_CATEGORY_DESCRIPTION).fill(`Created by Playwright: ${categoryName}`);
	await page.getByTestId(CATEGORY_DROPDOWN_IDS.CREATE_BUTTON).click();
	await expect(categorySelect.locator(`option:has-text("${categoryName}")`)).toHaveCount(1, { timeout: 15000 });
	await categorySelect.selectOption({ label: categoryName });
	await expect(categorySelect).not.toHaveValue(DROPDOWN_OPTIONS.CREATE_CATEGORY.value);
	await expect(page.getByTestId(TODO_LIST_IDS.TOGGLE_ADD_TODO_FORM.testId)).toBeVisible();
}

async function createTodo(page: import('@playwright/test').Page, title: string, description: string) {
	const addTodoButton = page.getByTestId(TODO_LIST_IDS.TOGGLE_ADD_TODO_FORM.testId);
	if (await addTodoButton.isVisible()) {
		await addTodoButton.click();
	}
	await page.getByTestId(ADD_TODO_IDS.TITLE_INPUT).fill(title);
	await page.getByTestId(ADD_TODO_IDS.DESCRIPTION_INPUT).fill(description);
	await Promise.all([
		page.waitForResponse((res) => res.url().includes(API_PATHS.TODOS) && res.request().method() === 'POST' && res.ok()),
		page.getByTestId(ADD_TODO_IDS.SAVE_BUTTON).click(),
	]);
	await expect(page.locator(`li:has-text("${title}")`)).toBeVisible();
}

test.describe('Category E2E', () => {
	const seed = Date.now();
	const categoryA = `PW Category A ${seed}`;
	const categoryB = `PW Category B ${seed}`;
	const todoA = `PW Todo in A ${seed}`;
	const todoB = `PW Todo in B ${seed}`;

	test.afterAll(async () => {
		const db = createTestDbClient();
		await deleteTodosByTitle(db, [todoA, todoB]);
		await deleteCategoriesByTitle(db, [categoryA, categoryB]);
	});

	test('shows only todos for the selected category', async ({ page }) => {
		await page.goto(BASE_URL);

		await createCategory(page, categoryA);
		await createTodo(page, todoA, 'belongs to A');

		await createCategory(page, categoryB);
		await createTodo(page, todoB, 'belongs to B');

		await page.getByTestId(CATEGORY_DROPDOWN_IDS.SELECT).selectOption({ label: categoryA });
		await expect(page.getByTestId(TODO_LIST_IDS.TOGGLE_ADD_TODO_FORM.testId)).toBeVisible();
		await expect(page.locator(`li:has-text("${todoA}")`)).toBeVisible();
		await expect(page.locator(`li:has-text("${todoB}")`)).toHaveCount(0);

		await page.getByTestId(CATEGORY_DROPDOWN_IDS.SELECT).selectOption({ label: categoryB });
		await expect(page.getByTestId(TODO_LIST_IDS.TOGGLE_ADD_TODO_FORM.testId)).toBeVisible();
		await expect(page.locator(`li:has-text("${todoB}")`)).toBeVisible();
		await expect(page.locator(`li:has-text("${todoA}")`)).toHaveCount(0);
	});
});
