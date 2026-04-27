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
