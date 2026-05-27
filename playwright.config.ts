import { defineConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), true);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/globalSetup.ts',
  use: {
    baseURL,
  },
  // To use authentication, add the following to your E2E test files:
  // test.use({ storageState: 'storageState.json' });
});
