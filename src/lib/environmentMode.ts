export function isTestDbActive(): boolean {
  if (process.env.TEST_DB_ACTIVE === 'true') {
    return true;
  }

  const testUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return Boolean(testUrl && runtimeUrl && testUrl === runtimeUrl);
}

export function getDevTitle(base: string): string {
  return process.env.NODE_ENV === 'production' ? base : `${base} - DEV`;
}
