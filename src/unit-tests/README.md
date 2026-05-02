# Unit tests (Vitest)

This project uses Vitest for unit testing. Unit tests live under `src/unit-tests/**/*.test.{ts,tsx}`; this folder contains examples like `category.test.ts` and `todo.test.ts`.

Integration tests are configured separately and live under `src/integration-tests`.

## Test environment

- Environment: `jsdom`
- Globals: enabled (so `describe/it/expect` are available)
- Setup file: `vitest.setup.ts` (adds `@testing-library/jest-dom` and sets dummy Supabase env vars)

See `vitest.config.ts`:

```ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['src/unit-tests/**/*.test.{ts,tsx}'],
  },
});
```

## Running tests

One-off (CI mode):

```bash
npx vitest run
```

Watch mode (re-runs on change):

```bash
npx vitest
```

With UI:

```bash
npx vitest --ui
```

Coverage:

```bash
npx vitest run --coverage
```

Run a single file:

```bash
npx vitest run src/unit-tests/todo.test.ts
```

Run tests by name (pattern match):

```bash
npx vitest -t "creates a todo"
```

## npm scripts

Convenient scripts are available in `package.json`:

```bash
npm run test            # alias for test:unit
npm run test:unit       # run unit tests
npm run test:unit:watch # unit watch mode
npm run test:unit:ui    # unit UI mode
npm run test:coverage   # unit coverage
```

## Notes on mocks in this repo

- Supabase client is mocked at the top of each test to provide the minimal `from().insert().select().single()` and `from().update().eq().select().single()` chains used by the services.
- `next-auth`'s `getServerSession` is mocked to return a dummy user.
- `global.fetch` is mocked to return a fake `/api/userid` response; we use `@ts-expect-error` to override `global.fetch` in the test environment and a minimal response type instead of `as any`.

If you add new tests that call additional Supabase methods, extend the mock chains accordingly.
