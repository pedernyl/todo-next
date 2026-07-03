# Playwright E2E Testing Instructions

## 0. Start app with test DB mapping

Before running Playwright, start Next.js with test database mapping:

```
npm run dev:testDb
For a more stable test environment, use:
npm run build:testDb && npm run start:testDb

The dev server can be disturbed by browser addons that inject HTML.
```

Playwright now runs a global fail-fast guard before any test starts.
The guard aborts if:
- required test DB vars are missing
- the app is not reachable
- the running app is not mapped to test DB

If blocked, restart the app with `npm run dev:testDb` and rerun Playwright.

## 1. Authenticate and Create `storageState.json`
Before running any E2E tests, you must set csp to off, start server and log in and save your authentication state:

```
npx playwright test tests/auth-setup.test.ts --headed --timeout=60000
```

- This will open a browser window.
- Log in with your GitHub account.
- When the test completes, a `storageState.json` file will be created in the project root.

## 2. Run All E2E Tests (excluding login script)
After you have created `storageState.json`, run all other Playwright tests with:

```
npx playwright test tests/*.spec.ts --headed
```

- This will execute all E2E tests except the login script.
- If you need to re-authenticate, repeat step 1.

---

**Note:**
- Do not commit `storageState.json` to version control (it is in `.gitignore`).
- Only run the login script when you need to refresh your authentication state.
- Remember to set csp to dev, off or report-only
- For the most stable Playwright runs, prefer `npm run build:testDb && npm run start:testDb` over `npm run dev:testDb`.

## Constants Policy For Playwright Tests

When creating or updating Playwright tests in this folder:

- Prefer domain constants from `src/constants/**` instead of hardcoded selector strings.
- Prefer `getByTestId(...)` with shared ID constants.
- Keep IDs and text separate:
	- IDs from `..._IDS` constants
	- Visible copy from `..._TEXT` / `GLOBAL.UI_TEXT` / `GLOBAL.LOADER_LABELS` when reused
- If a text value is used more than once in tests or app code, extract it to a constant.
- Reuse shared API route constants (`API_PATHS`) for response matching and route checks.

See the full policy in the "Constants Policy" section in [CONTRIBUTING.md](../CONTRIBUTING.md).
