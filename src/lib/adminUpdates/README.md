# Admin Updates

This folder contains the admin update loader and documentation.

The app loads update files through an **auto-generated, build-time-safe registry** in `src/lib/adminUpdates/updates/registry.generated.ts`. This ensures updates are always bundled and discoverable in production, even in serverless environments where the source `.ts` tree may not exist at runtime.

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

## Registration

**Registration is automatic.** After creating a new update file, you must regenerate the registry:

```bash
npm run generate:admin-updates
```

This script scans the `src/lib/adminUpdates/updates` directory, finds all `.ts` update files, and generates `registry.generated.ts` with static imports and a manifest array.

Registry consistency is enforced by `src/unit-tests/adminUpdatesRegistry.test.ts`, which verifies that every update file is included in the generated registry and that there are no duplicates.

Run the test with:

```bash
npx vitest run src/unit-tests/adminUpdatesRegistry.test.ts
```

## Required export

Each update file must export an async function that the loader can execute.

Preferred (named export):

```ts
export async function runAdminUpdate() {
  // perform update
  return { message: "Updated ..." };
}
```

Also supported (default export):

```ts
export default async function runAdminUpdate() {
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
2. Export an async update function (prefer named `runAdminUpdate`; default export is also supported).
3. Use `supabaseAdmin` and throw on errors.
4. Return a clear `message` for the admin UI.
5. Run `npm run generate:admin-updates` if you want to refresh immediately (the registry is also auto-generated before `npm run dev`, `npm run build`, and `npm test`).
6. Commit both the new update file and the updated `registry.generated.ts`.
7. Deploy and run from Admin -> Updates.
