import '@testing-library/jest-dom';
import { loadEnvConfig } from '@next/env';
import fs from 'node:fs';
import path from 'node:path';

// Load Next.js env files including .env.local for local Vitest runs.
loadEnvConfig(process.cwd(), true);

function readEnvVarFromFile(filePath: string, key: string): string | undefined {
	if (!fs.existsSync(filePath)) return undefined;
	const content = fs.readFileSync(filePath, 'utf8');
	const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
	if (!match?.[1]) return undefined;
	return match[1].trim().replace(/^['\"]|['\"]$/g, '');
}

if (!process.env.NEXT_PUBLIC_BASE_URL) {
	process.env.NEXT_PUBLIC_BASE_URL =
		readEnvVarFromFile(path.join(process.cwd(), '.env.local'), 'NEXT_PUBLIC_BASE_URL') ||
		readEnvVarFromFile(path.join(process.cwd(), '.env'), 'NEXT_PUBLIC_BASE_URL');
}

// Set dummy Supabase env variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';

if (!process.env.NEXT_PUBLIC_BASE_URL) {
	throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set for tests');
}
