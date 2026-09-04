import { test, expect } from '@playwright/test';
import { API_PATHS } from '../../src/constants/api/apiPaths';

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

});