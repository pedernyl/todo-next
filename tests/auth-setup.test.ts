import { test } from '@playwright/test';
import { AUTH_IDS } from '../src/constants/auth/auth';

// Explicitly override any storageState for this test file
test.use({ storageState: undefined });
import path from 'path';

const BASE_URL = 'http://localhost:3000';

test('authenticate via GitHub and save storage', async ({ page }) => {
  await page.goto(BASE_URL + '/login');
  const signInButton = page.getByTestId(AUTH_IDS.SIGN_IN_BUTTON);
  await signInButton.waitFor();
  await signInButton.click();
  // Complete the GitHub login manually in the opened browser window
  // Wait for redirect to dashboard (adjust selector as needed)
  await page.waitForURL(BASE_URL + '/');
  console.log('Saving storage state...');
  await page.context().storageState({ path: path.resolve(__dirname, '../storageState.json') }); // Save to project root
});
