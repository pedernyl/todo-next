import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
const require = createRequire(import.meta.url);
const nextCliPath = require.resolve('next/dist/bin/next');

const REQUIRED_TEST_DB_VARS = [
  'NEXT_PUBLIC_SUPABASE_TEST_URL',
  'NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY',
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
];

const [modeArg, ...rawArgs] = process.argv.slice(2);
const supportedModes = new Set(['dev', 'build', 'start']);

if (!modeArg || !supportedModes.has(modeArg)) {
  console.error('Usage: node scripts/with-test-db.mjs <dev|build|start> [next args] [--testDb]');
  process.exit(1);
}

const npmConfigTestDb = process.env.npm_config_testdb;
const useTestDbFromNpmConfig =
  typeof npmConfigTestDb === 'string' &&
  npmConfigTestDb.length > 0 &&
  npmConfigTestDb !== 'false' &&
  npmConfigTestDb !== '0';
const useTestDb = rawArgs.includes('--testDb') || useTestDbFromNpmConfig;
const nextArgs = rawArgs.filter((arg) => arg !== '--testDb');

loadEnvConfig(process.cwd(), modeArg === 'dev');
const allowTestDbBuild = process.env.ALLOW_TEST_DB_BUILD === 'true';

if (useTestDb) {
  if (modeArg === 'build' && !allowTestDbBuild) {
    console.error(
      [
        'Refusing to run build with --testDb to avoid producing test-database build artifacts.',
        'If this is intentional, set ALLOW_TEST_DB_BUILD=true for this command.',
      ].join('\n')
    );
    process.exit(1);
  }

  const missingVars = REQUIRED_TEST_DB_VARS.filter((name) => !process.env[name]);

  if (missingVars.length > 0) {
    console.error(
      [
        'Missing required integration-test environment variables for --testDb:',
        ...missingVars.map((name) => `- ${name}`),
        'Set these vars as documented in README -> Integration test variables.',
      ].join('\n')
    );
    process.exit(1);
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  process.env.TEST_DB_ACTIVE = 'true';
}

const child = spawn(process.execPath, [nextCliPath, modeArg, ...nextArgs], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
