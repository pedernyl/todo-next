import page from '@/app/login/page';
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
test.use({ storageState: 'storageState.json' });

test('Hide/Show Todos E2E', async ({ page }) => {
    await page.goto(BASE_URL);
    // Go to admin page
    await page.getByTestId('admin-link').click();

    // Change number of todos to load to 10
    await page.getByTestId('admin-link-settings').click();

    // Get number of todos to load before change
    // @todo we need to put back this value after test. 
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




