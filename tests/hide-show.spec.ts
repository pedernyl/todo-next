import { test, expect } from '@playwright/test';
import { createTestDbClient } from './helpers/dbClient';
import {
    deleteCategoriesByTitle,
    deleteTodosByTitle,
    getAdminSettingsFromYamlFile,
    getSettingValue,
    setSettingValue,
} from './helpers/cleanupHelpers';
import type { FindSettingsByKeyResult, AdminSettingsDefinition } from '@/lib/adminSettings/types';
import { DROPDOWN_OPTIONS } from '@/constants/dropdowns/categoryDropDown';


const BASE_URL = 'http://localhost:3000';
test.use({ storageState: 'storageState.json' });

test.describe('Hide/Show Todos E2E', () => {
    let db = createTestDbClient();
    let fieldKey = 'defaultLoadLimit';
    let originalSettingsRow: FindSettingsByKeyResult | undefined | null;
    let defaultValue: AdminSettingsDefinition;
    const createdTodoTitles: string[] = [];
    const createdCategoryTitles: string[] = [];

    test.beforeAll(async () => {
        // Fetch current value of load limit setting before test, so we can put it back after test.
        originalSettingsRow = await getSettingValue(db, fieldKey);
        
        // If no value found in database, try to get default value from yaml file, 
        // so that we don't leave side effects for local development and other tests.
        if ((originalSettingsRow?.length ?? 0) === 0) {
            defaultValue = await getAdminSettingsFromYamlFile('src/app/admin/settings/todos.yaml');
        }


    });

    test('should hide completed todos when clicked and scrolling', async ({ page }) => {
        await page.goto(BASE_URL);
        // Go to admin page
        await page.getByTestId('admin-link').click();

        // Change number of todos to load to 10
        await page.getByTestId('admin-link-settings').click();

        const loadLimitInput = 
            await page.locator('[id="App::todos--defaultLoadLimit"]').inputValue();

        const newLoadLimit = 10;   
        if(loadLimitInput !== newLoadLimit.toString()) {
            await page.locator('[id="App::todos--defaultLoadLimit"]').fill(newLoadLimit.toString());
            await page.getByTestId('save-setting-App::todos').click();
            await page.waitForTimeout(500);
        }

        
        // Go back to todos page
        await page.getByTestId('admin-link-todos').click();
        await page.waitForTimeout(500);

        // Click "Hide completed" button (because default is to show completed todos)
        await page.getByTestId('toggleShowCompleted').click();
    
        while (
            !await page.getByText('All todos loaded').isVisible() &&
            !await page.getByTestId(/^completed-/).isVisible()
        ) {
            await page.mouse.wheel(0, 500);
            await page.waitForTimeout(300);
        }

        await expect(page.getByTestId(/^completed-/)).toHaveCount(0);
    });

    test('should keep completed todos hidden after changing category', async ({ page }) => {
        //return;
        const seed = Date.now();
        const categoryTitle = `PW HideShow Category ${seed}`;
        const todoTitle = `PW HideShow Todo ${seed}`;
        createdCategoryTitles.push(categoryTitle);
        createdTodoTitles.push(todoTitle);

        await page.goto(BASE_URL);

        // Create a category.
        await page.waitForFunction(() => {
            const select = document.querySelector('select');
            return Boolean(select && (select as HTMLSelectElement).options.length >= 2);
        }, { timeout: 15000 });
        
        await page.getByTestId('category-select').selectOption(DROPDOWN_OPTIONS.CREATE_CATEGORY.value);
        await page.getByTestId('new-category-input').fill(categoryTitle);
        await page.getByTestId('new-category-description').fill(`Created by Playwright: ${categoryTitle}`);
        await page.getByTestId('create-category-button').click();
        await expect(
            page.getByTestId('category-select').locator(`option:has-text("${categoryTitle}")`)
        ).toHaveCount(1);
        await page.getByTestId('category-select').selectOption({ label: categoryTitle });
        await expect(page.getByTestId('category-select')).not.toHaveValue(DROPDOWN_OPTIONS.CREATE_CATEGORY.value);

        // Add a todo in the created category.
        const addTodoButton = page.getByTestId('toggleAddTodoForm');
        await addTodoButton.click();
        
        await page.getByTestId('todo-title-input').fill(todoTitle);
        await page.getByTestId('todo-description-input').fill(`Description for ${todoTitle}`);
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/api/todos') && res.request().method() === 'POST' && res.ok()),
            page.getByTestId('save-todo-button').click(),
        ]);
        const todoItem = page.locator(`li:has-text("${todoTitle}")`).first();
        await expect(todoItem).toBeVisible();

        // Set todo to completed.
        await todoItem.getByTestId(/^toggle-description-/).click();
        await todoItem.getByTestId(/^toggle-complete-/).click();
        await expect(todoItem.getByTestId(/^completed-/)).toHaveCount(1);

        // Change to all categories.
        await page.getByTestId('category-select').selectOption(DROPDOWN_OPTIONS.ALL_CATEGORIES.value);

        // Hide completed in all categories.
        await page.getByTestId('toggleShowCompleted').click();
        await expect(page.getByTestId(/^completed-/)).toHaveCount(0);

        // Select the created category again: the completed todo must stay hidden.
        await page.getByTestId('category-select').selectOption({ label: categoryTitle });
        await expect(page.locator(`li:has-text("${todoTitle}")`)).toHaveCount(0);
        await expect(page.getByTestId(/^completed-/)).toHaveCount(0);
    });

    

    test.afterAll(async () => {
        await deleteTodosByTitle(db, createdTodoTitles);
        await deleteCategoriesByTitle(db, createdCategoryTitles);

        // Put back original value of load limit setting after test.
        if (originalSettingsRow !== undefined && originalSettingsRow !== null && originalSettingsRow.length > 0) {
            const id = originalSettingsRow[0].id; 
            const settings = originalSettingsRow[0].settings; 
            await setSettingValue(db, settings, id);

            return;
        }
        // If no original value was found in database, try to put back default value from yaml file, so that we don't 
        // leave side effects for local development and other tests.
        const id = originalSettingsRow && originalSettingsRow[0] ? originalSettingsRow[0].id : -1; 
        
        const defaultSettings: Record<string, unknown> = Object.fromEntries(
            defaultValue.fields
                .filter((field) => field.default !== undefined)
                .map((field) => [field.key, field.default])
            );
        
        await setSettingValue(db, defaultSettings, id);
        
    });

});    


    

