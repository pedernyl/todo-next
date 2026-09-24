# Copilot Instructions for `todo-next`

Follow these standing instructions for all changes in this repository.

## Tech stack and architecture

- Framework: Next.js (App Router) + TypeScript
- Auth: NextAuth (GitHub provider)
- Data: Supabase
- Testing: Vitest (unit/integration) and Playwright (E2E)
- Deployment target: Vercel

When working with Next.js APIs, configuration, or version-specific behavior, consult the documentation shipped with the installed Next.js version in `node_modules/next/dist/docs` before relying on memory or external documentation. Treat the installed package version as the source of truth.

When writing pull requests, suggesting code changes, answering questions about best practices, or planning implementation, consult the local Next.js documentation and the TypeScript documentation, then search the internet for current official guidance. Match all recommendations to the resolved Next.js and TypeScript versions in `package-lock.json`; do not rely on guidance for a different major version.

Primary folders:

- `src/app` — routes and API handlers
- `src/actions` — Server Actions invoked by the React UI
- `src/components` — UI components
- `src/lib` — shared server/client logic (including `adminSettings` and `adminUpdates`)
- `src/lib/queries` — reusable read-only data access grouped by domain
- `src/unit-tests` and `src/integration-tests` — Vitest suites
- `tests` — Playwright E2E tests

## Git workflow and branch naming

- Never push directly to `main`.
- Create short-lived branches from `main` and open PRs back to `main`.
- Use branch prefixes exactly as defined in `CONTRIBUTING.md`:
  - `feature/` for new functionality
  - `fix/` for bug fixes
  - `refactor/` for code restructuring or internal improvements that preserve behavior
  - `chore/` for maintenance, dependency updates, and documentation
- Use hyphens (`-`), not underscores (`_`), in branch names.
- PRs are merged with **Squash and merge** (no merge commits).

## Commit and PR conventions

- Write commit messages in the imperative mood (for example: `Add sort index for todos`).
- Keep PR titles descriptive because squash merge uses the PR title as the commit message on `main`.
- Keep changes focused and minimal to the requested task.

## Server Actions

- Place UI-triggered Server Actions in `src/actions/` and group files by lowercase, singular domain name: `category.ts`, `todo.ts`, or `admin/settings.ts`.
- Do not use redundant file suffixes such as `categoryAction.ts`.
- Name exports for their operation, such as `deleteCategory`.
- Action modules validate input, authenticate and authorize the current user, and return only what the UI needs.
- Keep reusable database access in `src/lib`; see `src/actions/README.md` for the complete convention.

## Queries

- Place reusable read-only data access in `src/lib/queries/` and group files by lowercase, singular domain name: `category.ts`, `todo.ts`, or `user.ts`.
- Do not use redundant file suffixes such as `categoryQuery.ts`.
- Name exports for the data they retrieve, such as `getCategoriesForUser`.
- Queries must scope data by owner and enforce authorization when they accept user-controlled input.
- See `src/lib/queries/README.md` for the complete convention.

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
