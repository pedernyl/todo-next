const REQUIRED_TEST_DB_VARS = [
  'NEXT_PUBLIC_SUPABASE_TEST_URL',
  'NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY',
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
] as const;

export function getMissingRequiredTestDbVars(): string[] {
  return REQUIRED_TEST_DB_VARS.filter((name) => !process.env[name]);
}

export function assertRequiredTestDbEnv(context: string): void {
  const missingVars = getMissingRequiredTestDbVars();

  if (missingVars.length === 0) {
    return;
  }

  throw new Error(
    [
      `${context}: missing required test database environment variables.`,
      ...missingVars.map((name) => `- ${name}`),
      'Start the app with test DB mapping before running Playwright: npm run dev:testDb',
    ].join('\n')
  );
}
