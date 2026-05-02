# Integration tests (Vitest)

Integration tests live under `src/integration-tests/**/*.integration.test.{ts,tsx}` and run with a dedicated Vitest config.

## Required environment variables

Integration tests are configured to use the test database. These variables must be set in `.env.local` (see `.env.example` for a template):

- `NEXT_PUBLIC_SUPABASE_TEST_URL` — Supabase URL of your test project
- `NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY` — anon key for the test project
- `SUPABASE_TEST_SERVICE_ROLE_KEY` — service role key for the test project (server-side only; never expose to browser)

During integration test setup (`vitest.integration.setup.ts`), these are mapped to the app's standard Supabase env vars so the app code always uses the test database:

- `SUPABASE_SERVICE_ROLE_KEY` <- `SUPABASE_TEST_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` <- `NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` <- `NEXT_PUBLIC_SUPABASE_TEST_URL`

## Run integration tests

```bash
npm run test:integration
```

Watch mode:

```bash
npm run test:integration:watch
```

## Notes

- Integration tests are not part of the default `npm test` command.
- CI workflow runs unit tests only (`npm run test:unit`).
