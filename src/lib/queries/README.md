# Queries

This directory contains reusable read-only data-access functions, grouped by domain.

## File naming

Use one lowercase, singular domain file per query group:

```text
src/lib/queries/category.ts
src/lib/queries/todo.ts
src/lib/queries/user.ts
```

Do not repeat the directory role in the file name. Use `category.ts`, not `categoryQuery.ts` or `category.queries.ts`.

Name exports for the data they retrieve, such as `getCategoriesForUser`, `getCategoryById`, and `getTodosForCategory`.

## Query boundaries

- Queries are read-only; write operations belong in Server Actions or the appropriate service layer.
- Validate identifiers and enforce authentication and authorization within a query when it accepts user-controlled input.
- Scope data by the authenticated owner where applicable; do not rely on a caller to enforce ownership.
- Return only the data required by the caller.
- Keep low-level shared Supabase helpers in `src/lib` and compose them here when useful.
