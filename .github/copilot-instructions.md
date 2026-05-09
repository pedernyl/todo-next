# Copilot Instructions for `todo-next`

Follow these standing instructions for all changes in this repository.

## Tech stack and architecture

- Framework: Next.js (App Router) + TypeScript
- Auth: NextAuth (GitHub provider)
- Data: Supabase
- Testing: Vitest (unit/integration) and Playwright (E2E)
- Deployment target: Vercel

Primary folders:

- `src/app` — routes and API handlers
- `src/components` — UI components
- `src/lib` — shared server/client logic (including `adminSettings` and `adminUpdates`)
- `src/unit-tests` and `src/integration-tests` — Vitest suites
- `tests` — Playwright E2E tests

## Git workflow and branch naming

- Never push directly to `main`.
- Create short-lived branches from `main` and open PRs back to `main`.
- Use branch prefixes exactly as defined in `CONTRIBUTING.md`:
  - `feature/` for new functionality
  - `fix/` for bug fixes
  - `chore/` for maintenance/docs/refactors
- Use hyphens (`-`), not underscores (`_`), in branch names.
- PRs are merged with **Squash and merge** (no merge commits).

## Commit and PR conventions

- Write commit messages in the imperative mood (for example: `Add sort index for todos`).
- Keep PR titles descriptive because squash merge uses the PR title as the commit message on `main`.
- Keep changes focused and minimal to the requested task.

## Versioning and releases

- Follow simplified SemVer: `v0.MINOR.PATCH`.
- Bump `MINOR` for meaningful feature milestones.
- Bump `PATCH` for bug fixes or small improvements.
- Create releases only when meaningful features/fixes land on `main`.

## Database changes

- Never use Supabase migrations or the Supabase CLI to modify the database schema.
- All database changes must go through the `adminUpdates` workflow in `src/lib/adminUpdates`.
- Run `npm run check:admin-updates-registry` after any changes to admin updates and commit the generated registry.

## Validation expectations

Before finalizing work, run the checks that apply to your change:

- `npm run check:admin-updates-registry` (ensure generated registry is current when relevant)
- `npm run test:unit`
- Additional targeted tests as needed (`test:integration`, Playwright, etc.)

When working on admin updates, follow the documented workflow and commit generated registry changes when required.
