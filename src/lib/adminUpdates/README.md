# Admin Updates

This folder contains the admin update loader and documentation.

The app auto-discovers update files in `src/lib/adminUpdates/updates` and shows them in the Admin Updates UI. No manual registration is required.

## File naming

Each update file must follow this pattern:

`<updateName>_<unixTimestamp>.ts`

Example:

`setTodoSortIndexToMinusOne_1776152030.ts`

Rules:

- `updateName` should be descriptive and stable.
- `unixTimestamp` must be a numeric Unix timestamp (seconds).
- Use one file per update.
- Do not rename a file after it has been run in an environment, because execution logs use the file name as the update id.

## Required export

Each update file must export an async function named `runAdminUpdate`.

```ts
export async function runAdminUpdate() {
  // perform update
  return { message: "Updated ..." };
}
```

The function should return an object with a user-facing `message` string.

## How to code SQL-style updates

Write the update in TypeScript using `supabaseAdmin` queries. This replaces raw SQL migration files for runtime-admin updates.

Example:

```ts
import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin
    .from("todos")
    .update({ sort_index: -1 })
    .not("id", "is", null);

  if (error) {
    throw new Error(`Failed to set sort_index to -1: ${error.message}`);
  }

  return {
    message: "Updated todos.sort_index to -1 for all rows.",
  };
}
```

## Safety and auth

Execution is protected by:

- NextAuth session checks in the admin API route.
- Allowed-user checks from `NEXTAUTH_ALLOWED_USERS`.
- Single-run tracking in the `Updates` table (with optional force re-run from UI).

## Developer checklist

1. Create a new file in `src/lib/adminUpdates/updates` with `<updateName>_<unixTimestamp>.ts`.
2. Export `runAdminUpdate`.
3. Use `supabaseAdmin` and throw on errors.
4. Return a clear `message` for the admin UI.
5. Deploy and run from Admin -> Updates.
