import { test, expect } from '@playwright/test';
import { createTestDbClient } from './helpers/dbClient';
import { deleteTodosByTitle, deleteCategoriesByTitle, getCategoryIdByTitle } from './helpers/cleanupHelpers';
import { selectCategory } from './helpers/categoryHelpers';
import { API_PATHS } from '@/constants/api/apiPaths';
import { CATEGORY_DROPDOWN_IDS, DROPDOWN_OPTIONS } from '@/constants/dropdowns/categoryDropDown';
import { ADD_TODO_IDS } from '@/constants/todo/AddTodo';
import { TODO_LIST_IDS } from '@/constants/todo/TodoList';

const BASE_URL = 'http://localhost:3000';
test.use({ storageState: 'storageState.json' });
const db = createTestDbClient();

async function createCategory(page: import('@playwright/test').Page, categoryName: string) {
	const triggerButton = page.getByTestId(CATEGORY_DROPDOWN_IDS.TRIGGER_BUTTON);
	await expect(triggerButton).toBeVisible();
	await triggerButton.click();

    await page.getByTestId(DROPDOWN_OPTIONS.CREATE_CATEGORY.testId).click();
	await page.getByTestId(CATEGORY_DROPDOWN_IDS.NEW_CATEGORY_INPUT).fill(categoryName);
    await page.getByTestId(CATEGORY_DROPDOWN_IDS.NEW_CATEGORY_DESCRIPTION).fill(`Created by Playwright: ${categoryName}`);
    await page.getByTestId(CATEGORY_DROPDOWN_IDS.CREATE_BUTTON).click();

	await expect(triggerButton).toHaveText(categoryName, { timeout: 15000 });
	const categoryId = await getCategoryIdByTitle(db, categoryName);
	await selectCategory(page, categoryId);

	// Ensure the "Add Todo" form is visible after selecting the new category
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

async function checkThatTodoBelongsToCategory(
	page: import('@playwright/test').Page, 
	todoShouldBelongToCategory: string,
	todoShouldNotBelongToCategory: string, 
	categoryName: string
) {
	const categoryId = await getCategoryIdByTitle(db, categoryName);
	await selectCategory(page, categoryId);
	const triggerButton = page.getByTestId(CATEGORY_DROPDOWN_IDS.TRIGGER_BUTTON);
	await expect(triggerButton).toHaveText(categoryName, { timeout: 15000 });

	await expect(page.locator(`li:has-text("${todoShouldBelongToCategory}")`)).toBeVisible();
	await expect(page.locator(`li:has-text("${todoShouldNotBelongToCategory}")`)).toHaveCount(0);

}

test.describe('Category E2E', () => {
	const seed = Date.now();
	const categoryA = `PW Category A ${seed}`;
	const categoryB = `PW Category B ${seed}`;
	const todoA = `PW Todo in A ${seed}`;
	const todoB = `PW Todo in B ${seed}`;

	test.afterAll(async () => {
		await deleteTodosByTitle(db, [todoA, todoB]);
		await deleteCategoriesByTitle(db, [categoryA, categoryB]);
	});

	test('shows only todos for the selected category', async ({ page }) => {
		await page.goto(BASE_URL);

		await createCategory(page, categoryA);
		await createTodo(page, todoA, 'belongs to A');

		await createCategory(page, categoryB);
		await createTodo(page, todoB, 'belongs to B');

		await checkThatTodoBelongsToCategory(page, todoB, todoA, categoryB);
		await checkThatTodoBelongsToCategory(page, todoA, todoB, categoryA);
	});
});
