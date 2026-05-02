import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.integration.setup.ts',
    include: ['src/integration-tests/**/*.integration.test.{ts,tsx}'],
  },
});
