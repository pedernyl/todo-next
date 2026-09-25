# Server Actions

This directory contains Server Actions invoked by the app's React UI.

## File naming

Use one lowercase, singular domain file per action group:

```text
src/actions/category.ts
src/actions/todo.ts
src/actions/admin/settings.ts
```

Do not repeat the directory role in the file name. Use `category.ts`, not `categoryAction.ts` or `category.actions.ts`.

Name exported functions for the operation they perform, such as `deleteCategory`, `createCategory`, and `updateCategoryCompletion`.

## Module boundaries

- Start each action module with `"use server"` when Client Components import its actions.
- Actions must validate input and authenticate and authorize the current user before changing data.
- Return only the data required by the UI.
- Keep reusable database queries and lower-level Supabase logic in `src/lib`; actions coordinate a UI mutation rather than replacing the data-access layer.
- Keep actions grouped by domain. Split a file only when the domain itself has a clear subdomain.
