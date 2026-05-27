import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client for use in Playwright test cleanup.
 * Uses the service role key to bypass RLS.
 * Reads from the same env vars as the running app, so it targets
 * whichever database (prod or test) the app is currently configured against.
 */
export function createTestDbClient(): SupabaseClient {
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
