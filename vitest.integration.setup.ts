import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";

// loadEnvConfig deliberately skips .env.local when NODE_ENV=test (hardcoded in @next/env).
// For integration tests we need .env.local, so we load it ourselves first.
// Only sets keys that are not already in process.env, so explicit CLI vars always win.
const envFilePriority = [".env.local", ".env"];
for (const file of envFilePriority) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Also run loadEnvConfig to pick up .env.test and .env.
loadEnvConfig(process.cwd(), true);

const requiredIntegrationEnvVars = [
  "SUPABASE_TEST_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_TEST_URL",
] as const;

for (const envVarName of requiredIntegrationEnvVars) {
  if (!process.env[envVarName]) {
    throw new Error(`Missing required integration test env var: ${envVarName}`);
  }
}

// Force integration tests to use test database credentials only.
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY as string;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY as string;
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL as string;
