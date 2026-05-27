import type { FullConfig } from '@playwright/test';
import { assertRequiredTestDbEnv } from './helpers/testDbEnvGuard';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const TEST_DB_STATUS_PATH = '/api/test-db-status';

function resolveBaseUrl(config: FullConfig): string {
  const fromConfig = config.projects.find((project) => typeof project.use.baseURL === 'string')?.use
    .baseURL;

  if (fromConfig) {
    return fromConfig;
  }

  return process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
}

function buildMismatchError(baseUrl: string): Error {
  return new Error(
    [
      `Playwright test DB guard blocked this run: app at ${baseUrl} is not using the test database.`,
      'Recovery:',
      '1. Stop the current app server.',
      '2. Start with test DB mapping for a more stable environment: npm run build:testDb && npm run start:testDb',
      '3. Run Playwright again.',
    ].join('\n')
  );
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  assertRequiredTestDbEnv('Playwright global setup');

  const baseUrl = resolveBaseUrl(config);
  const statusUrl = new URL(TEST_DB_STATUS_PATH, baseUrl).toString();

  let response: Response;
  try {
    response = await fetch(statusUrl, { cache: 'no-store' });
  } catch {
    throw new Error(
      [
        `Playwright test DB guard could not reach ${statusUrl}.`,
        `Ensure the app is running before Playwright (expected base URL: ${baseUrl}).`,
      ].join('\n')
    );
  }

  if (!response.ok) {
    throw new Error(
      [
        `Playwright test DB guard received HTTP ${response.status} from ${statusUrl}.`,
        'Ensure the app is started and reachable, then try again.',
      ].join('\n')
    );
  }

  const payload = (await response.json()) as { testDbActive?: unknown };
  if (payload.testDbActive !== true) {
    throw buildMismatchError(baseUrl);
  }
}
