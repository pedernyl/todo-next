# Contributing & Versioning

## Branch structure

`main` is always stable and deployed to production. Never push directly to `main`.

All work happens in short-lived branches that are merged via pull requests.

### Branch naming

```
feature/sort-index-for-todos
fix/csp-header-bug
chore/update-dependencies
```

Use one of three prefixes:

- `feature/` — new functionality
- `fix/` — bug fix
- `chore/` — maintenance that does not affect functionality (dependency updates, refactoring, docs)

Use hyphens, not underscores.

## Workflow

1. Create a branch from `main`

```bash
git checkout main
git pull
git checkout -b feature/your-feature-name
```

2. Work and commit on your branch
3. Push and open a pull request against `main`
4. Merge using **Squash and merge** — this keeps the history on `main` clean and linear

> Do not use "Create a merge commit". Branch protection enforces linear history.

## Versioning

This project uses a simplified version of [Semantic Versioning](https://semver.org/) (`v0.MINOR.PATCH`).

The project is in active development and stays on `v0.x.x` until the app feels feature-complete.

| Part | When to bump |
|------|-------------|
| `MINOR` | A meaningful feature is done — something worth marking as a milestone |
| `PATCH` | A bug fix or small improvement |

`v1.0.0` is reserved for when the app feels stable and complete.

### When to create a release

Create a new release when a meaningful feature or fix lands on `main` — not after every commit. Use your judgment.

### How to tag a release

```bash
git checkout main
git pull
git tag -a v0.4.0 -m "Add sort index for todos"
git push origin v0.4.0
```

Then go to **GitHub → Releases → Draft a new release**, select the tag, and write a short changelog describing what changed.

### Example changelog entry

```
## v0.4.0

- Added sort index for todos
- Fixed CSP header not applying on redirect routes
```

## Commit messages

Write commit messages in the imperative mood, describing what the commit does:

```
Add sort index for todos
Fix CSP header on redirect routes
Update dependencies
```

Since we use squash merge, the PR title becomes the commit message on `main` — make it descriptive.

## Constants Policy

Use constants to keep user communication and selectors stable, testable, and easy to refactor.

### 1) All user-facing text must be constants

Move all user-facing text into constants, including:

- labels
- button text
- headings
- placeholders
- tooltips/aria labels
- empty states
- confirmation dialog text
- alert/toast/error text shown in UI
- API error/message strings that are shown to users

Do not hardcode user-facing strings directly in JSX or route responses intended for UI display.

### 2) Console/log/debug messages are exempt

Developer-only messages are not user communication and can stay inline.

Examples:

- `console.log(...)`
- `console.warn(...)`
- `console.error(...)`
- internal debug traces

### 3) Error-message rule

Error messages shown to users must be constants.

They do not need translation/i18n scaffolding; plain constants are sufficient.

### 4) Organize constants by domain only

Split constants under `src/constants/<domain>/`.

Examples:

- `src/constants/todo/...`
- `src/constants/admin/...`
- `src/constants/dropdowns/...`
- `src/constants/auth/...`
- `src/constants/api/...`
- `src/constants/global/...`

Never create one catch-all shared constants file for unrelated domains.

### 5) Keep test IDs separate from text constants

Keep selector/test-id constants separate from user-facing text constants.

- IDs in `..._IDS` objects (for example `ADD_TODO_IDS`)
- User text in `..._TEXT` or equivalent text-focused objects

Do this even when both live in the same domain folder.

### 6) Every meaningful HTML element needs a data-testid from constants

Add `data-testid` to meaningful/interactive UI elements (inputs, buttons, links, list items, key containers used in assertions).

`data-testid` values must come from constants, not inline strings.

### 7) Tests should reuse constants

- Prefer `getByTestId(...)` with shared constants.
- Avoid hardcoded selectors when a constants-backed id exists.
- Reuse constants for known user-visible message assertions where practical.

## Admin Settings YAML

Admin settings schemas live in `src/app/admin/settings`.

Contribution rules:

- Each YAML file represents one component/function/domain settings group.
- Use `name` + `type` as the identity for that group.
- Add one or more `fields` entries in that file.
- Keep `name` + `type` unique across files.

For the complete format and validation rules, see `src/app/admin/settings/README.md`.
