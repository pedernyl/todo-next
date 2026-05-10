import { spawn } from "node:child_process";

export type DatabaseCopyMode = "overwrite" | "append";

type CopyAvailability = {
  available: boolean;
  missingVariables: string[];
};

function isPostgresConnectionString(value: string): boolean {
  return value.startsWith("postgres://") || value.startsWith("postgresql://");
}

function getSupabaseRefFromUrl(urlValue: string): string | undefined {
  try {
    const host = new URL(urlValue).hostname;
    if (!host.endsWith(".supabase.co")) {
      return undefined;
    }

    const [projectRef] = host.split(".");
    return projectRef || undefined;
  } catch {
    return undefined;
  }
}

function toPostgresConnectionString(urlValue: string, password: string, refOverride?: string): string {
  if (isPostgresConnectionString(urlValue)) {
    return urlValue;
  }

  const projectRef = refOverride ?? getSupabaseRefFromUrl(urlValue);
  if (!projectRef) {
    throw new Error(
      "Could not derive Supabase project ref from URL. Use a postgres:// URL or set SUPABASE_TEST_REF."
    );
  }

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
}

function getProdDbUrl(): string | undefined {
  const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prodPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!prodUrl || !prodPassword) {
    return undefined;
  }

  return toPostgresConnectionString(prodUrl, prodPassword);
}

function getTestDbUrl(): string | undefined {
  const testUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  const testPassword = process.env.SUPABASE_TEST_DB_PASSWORD;
  const testRef = process.env.SUPABASE_TEST_REF;

  if (!testUrl || !testPassword) {
    return undefined;
  }

  return toPostgresConnectionString(testUrl, testPassword, testRef);
}

export function getDatabaseCopyAvailability(): CopyAvailability {
  const missingVariables: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_DB_PASSWORD) {
    missingVariables.push("SUPABASE_DB_PASSWORD");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_TEST_URL) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_TEST_URL");
  }
  if (!process.env.SUPABASE_TEST_DB_PASSWORD) {
    missingVariables.push("SUPABASE_TEST_DB_PASSWORD");
  }

  return {
    available: missingVariables.length === 0,
    missingVariables,
  };
}

function runDumpRestorePipeline(
  dumpArgs: string[],
  restoreArgs: string[],
  options?: { allowRestoreErrors?: boolean }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dumper = spawn("pg_dump", dumpArgs, { stdio: ["ignore", "pipe", "pipe"] });
    const restorer = spawn("psql", restoreArgs, { stdio: ["pipe", "pipe", "pipe"] });

    dumper.stdout.pipe(restorer.stdin);

    let dumpStderr = "";
    let restoreStderr = "";
    let dumpExitCode: number | null = null;
    let restoreExitCode: number | null = null;
    let settled = false;

    const tryFinalize = () => {
      if (settled || dumpExitCode === null || restoreExitCode === null) {
        return;
      }

      const restoreFailed = restoreExitCode !== 0 && !options?.allowRestoreErrors;
      if (dumpExitCode !== 0 || restoreFailed) {
        settled = true;
        reject(
          new Error(
            [
              "Database copy failed.",
              dumpExitCode !== 0 ? `pg_dump exited with ${dumpExitCode}.` : null,
              restoreFailed ? `psql exited with ${restoreExitCode}.` : null,
              dumpStderr ? `pg_dump: ${dumpStderr.trim()}` : null,
              restoreStderr ? `psql: ${restoreStderr.trim()}` : null,
            ]
              .filter(Boolean)
              .join(" ")
          )
        );
        return;
      }

      settled = true;
      resolve();
    };

    dumper.stderr.on("data", (chunk) => {
      dumpStderr += chunk.toString();
    });
    restorer.stderr.on("data", (chunk) => {
      restoreStderr += chunk.toString();
    });

    dumper.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Failed to run pg_dump: ${error.message}`));
    });

    restorer.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Failed to run psql: ${error.message}`));
    });

    dumper.on("close", (code) => {
      dumpExitCode = code;
      tryFinalize();
    });

    restorer.on("close", (code) => {
      restoreExitCode = code;
      tryFinalize();
    });
  });
}

export async function copyProductionDatabaseToTest(mode: DatabaseCopyMode): Promise<void> {
  const prodDbUrl = getProdDbUrl();
  const testDbUrl = getTestDbUrl();
  const availability = getDatabaseCopyAvailability();

  if (!prodDbUrl || !testDbUrl || !availability.available) {
    throw new Error(
      `Database copy is not available. Missing variables: ${availability.missingVariables.join(", ")}`
    );
  }

  if (mode === "overwrite") {
    await runDumpRestorePipeline(
      [
        "--schema",
        "public",
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        "--dbname",
        prodDbUrl,
      ],
      ["--dbname", testDbUrl, "-v", "ON_ERROR_STOP=1"]
    );
    return;
  }

  await runDumpRestorePipeline(
    [
      "--schema-only",
      "--schema",
      "public",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      prodDbUrl,
    ],
    ["--dbname", testDbUrl, "-v", "ON_ERROR_STOP=0"],
    { allowRestoreErrors: true }
  );

  await runDumpRestorePipeline(
    [
      "--data-only",
      "--schema",
      "public",
      "--inserts",
      "--column-inserts",
      "--on-conflict-do-nothing",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      prodDbUrl,
    ],
    ["--dbname", testDbUrl, "-v", "ON_ERROR_STOP=1"]
  );
}
