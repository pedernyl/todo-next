import { expect } from "vitest";

export function assertIntegrationTestDbEnvIsActive(): void {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(process.env.NEXT_PUBLIC_SUPABASE_TEST_URL);
  expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY);
  expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe(process.env.SUPABASE_TEST_SERVICE_ROLE_KEY);
}
