import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertRequiredTestDbEnv } from './testDbEnvGuard';

/**
 * Creates a Supabase admin client for use in Playwright test cleanup.
 * Uses the service role key to bypass RLS.
 * Always uses the explicit test database env vars.
 * Playwright global setup verifies the running app is also mapped to test DB.
 */
export function createTestDbClient(): SupabaseClient {
  assertRequiredTestDbEnv('Playwright cleanup client');

  const supabaseTestUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  const serviceRoleKeyTest = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  if (!supabaseTestUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_TEST_URL is not set — cannot create test DB client for cleanup');
  }
  if (!serviceRoleKeyTest) {
    throw new Error('SUPABASE_TEST_SERVICE_ROLE_KEY is not set — cannot create test DB client for cleanup');
  }

  return createClient(supabaseTestUrl, serviceRoleKeyTest, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
