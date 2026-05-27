import { defineConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), true);

export default defineConfig({
  testDir: './tests',
  // To use authentication, add the following to your E2E test files:
  // test.use({ storageState: 'storageState.json' });
});
