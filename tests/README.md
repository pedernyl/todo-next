# Playwright E2E Testing Instructions

## 0. Start app with test DB mapping

Before running Playwright, start Next.js with test database mapping:

```
npm run dev:testDb
To ensure more stable tests use
npm run build:testDb and npm run start:testDb 
Dev server can report errors if there is some addons that add html
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
