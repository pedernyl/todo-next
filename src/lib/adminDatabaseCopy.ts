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

  if (!prodUrl) {
    return undefined;
  }

  if (isPostgresConnectionString(prodUrl)) {
    return prodUrl;
  }

  const prodPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!prodPassword) {
    return undefined;
  }

  return toPostgresConnectionString(prodUrl, prodPassword);
}

function getTestDbUrl(): string | undefined {
  const testUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  const testRef = process.env.SUPABASE_TEST_REF;

  if (!testUrl) {
    return undefined;
  }

  if (isPostgresConnectionString(testUrl)) {
    return testUrl;
  }

  const testPassword = process.env.SUPABASE_TEST_DB_PASSWORD;
  if (!testPassword) {
    return undefined;
  }

  return toPostgresConnectionString(testUrl, testPassword, testRef);
}

export function getDatabaseCopyAvailability(): CopyAvailability {
  const missingVariables: string[] = [];
  const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const testUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;

  if (!prodUrl) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
  } else if (!isPostgresConnectionString(prodUrl) && !process.env.SUPABASE_DB_PASSWORD) {
    missingVariables.push("SUPABASE_DB_PASSWORD");
  }

  if (!testUrl) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_TEST_URL");
  } else if (!isPostgresConnectionString(testUrl) && !process.env.SUPABASE_TEST_DB_PASSWORD) {
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

function runPsqlCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("psql", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let settled = false;

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Failed to run psql: ${error.message}`));
    });

    proc.on("close", (code) => {
      if (settled) {
        return;
      }

      if (code !== 0) {
        settled = true;
        reject(
          new Error(
            [
              "Database copy failed during post-restore grants.",
              `psql exited with ${code}.`,
              stderr ? `psql: ${stderr.trim()}` : null,
            ]
              .filter(Boolean)
              .join(" ")
          )
        );
        return;
      }

      settled = true;
      resolve();
    });
  });
}

async function applySupabasePublicSchemaGrants(dbUrl: string): Promise<void> {
  const grantSql = [
    "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;",
    "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;",
    "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;",
    "GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;",
  ].join(" ");

  await runPsqlCommand(["--dbname", dbUrl, "-v", "ON_ERROR_STOP=1", "-c", grantSql]);
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
        "--no-acl",
        "--clean",
        "--if-exists",
        "--dbname",
        prodDbUrl,
      ],
      ["--dbname", testDbUrl, "-v", "ON_ERROR_STOP=1"]
    );
    await applySupabasePublicSchemaGrants(testDbUrl);
    return;
  }

  await runDumpRestorePipeline(
    [
      "--schema-only",
      "--schema",
      "public",
      "--no-owner",
      "--no-acl",
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
      "--no-acl",
      "--dbname",
      prodDbUrl,
    ],
    ["--dbname", testDbUrl, "-v", "ON_ERROR_STOP=1"]
  );

  await applySupabasePublicSchemaGrants(testDbUrl);
}
