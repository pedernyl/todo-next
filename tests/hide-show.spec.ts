import page from '@/app/login/page';
import { test, expect } from '@playwright/test';
import { createTestDbClient } from './helpers/dbClient';
import { getSettingValue, setSettingValue } from './helpers/cleanupHelpers';
import type { FindSettingsByKeyResult } from '@/lib/adminSettings/types';


const BASE_URL = 'http://localhost:3000';
test.use({ storageState: 'storageState.json' });

test.describe('Hide/Show Todos E2E', () => {
    let db = createTestDbClient();
    let fieldKey = 'defaultLoadLimit';
    let originalSettingsRow: FindSettingsByKeyResult | undefined | null;

    test.beforeAll(async () => {
        // Fetch current value of load limit setting before test, so we can put it back after test.
        originalSettingsRow = await getSettingValue(db, fieldKey);
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

    test.afterAll(async () => {
        // Put back original value of load limit setting after test.
        if (originalSettingsRow !== undefined && originalSettingsRow !== null) {
            console.log('Restoring original setting value for ${fieldKey}:', originalSettingsRow);
            const id = originalSettingsRow[0].id; 
            const settings = originalSettingsRow[0].settings; 
            await setSettingValue(db, settings, id);
        }
    });

});    


    

