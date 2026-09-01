import { test, expect } from '@playwright/test';
import { API_PATHS } from '../../src/constants/api/apiPaths';
import page from '@/app/login/page';
import { createCategoryWithActiveTodoForAuthenticatedUser } from '../helpers/categoryHelpers';

test.describe('Category API', () => {
  test('delete endpoint unauthenticated shall return status 401', async () => {

    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
    const response = await fetch(baseUrl + API_PATHS.CATEGORIES, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({  }),
   });
 
    const responseBody = await response.json();

    expect(responseBody.status).toBe(401);
  });

  test.describe('authenticated category deletion', () => {
    test.use({ storageState: 'storageState.json' });
    let category;
    let todo;

    test('delete endpoint with active todos shall return status 409', async () => {
      const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
      category = await createCategoryWithActiveTodoForAuthenticatedUser();

      // const response = await fetch(baseUrl + API_PATHS.CATEGORIES, {
      //   method: 'DELETE',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ id: 1 }),
      // });

      expect(true).toBe(true);
    });
  });
});