import { spawn } from "node:child_process";

export type DatabaseCopyMode = "overwrite" | "append";

type CopyAvailability = {
  available: boolean;
  missingVariables: string[];
};

type ParsedDatabaseTarget = {
  host: string;
  port: string;
  database: string;
  username: string;
};

function getProdDbUrl(): string | undefined {
  return process.env.SUPABASE_PROD_DB_URL ?? process.env.SUPABASE_DB_URL;
}

function getTestDbUrl(): string | undefined {
  return process.env.SUPABASE_TEST_DB_URL;
}

export function getDatabaseCopyAvailability(): CopyAvailability {
  const missingVariables: string[] = [];

  if (!process.env.SUPABASE_PROD_DB_URL && !process.env.SUPABASE_DB_URL) {
    missingVariables.push("SUPABASE_PROD_DB_URL or SUPABASE_DB_URL");
  }
  if (!process.env.SUPABASE_TEST_DB_URL) {
    missingVariables.push("SUPABASE_TEST_DB_URL");
  }

  return {
    available: missingVariables.length === 0,
    missingVariables,
  };
}

function parseDatabaseTarget(dbUrl: string, envVarName: string): ParsedDatabaseTarget {
  let parsed: URL;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error(
      `Invalid ${envVarName}. Use a valid postgres:// or postgresql:// connection string.`
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      `Invalid ${envVarName}. Use a valid postgres:// or postgresql:// connection string.`
    );
  }

  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    database: parsed.pathname.replace(/^\/+/, "") || "postgres",
    username: decodeURIComponent(parsed.username || ""),
  };
}

function ensureDistinctDatabaseTargets(prodDbUrl: string, testDbUrl: string): void {
  const prodTarget = parseDatabaseTarget(
    prodDbUrl,
    process.env.SUPABASE_PROD_DB_URL ? "SUPABASE_PROD_DB_URL" : "SUPABASE_DB_URL"
  );
  const testTarget = parseDatabaseTarget(testDbUrl, "SUPABASE_TEST_DB_URL");

  const prodIdentity = `${prodTarget.username}@${prodTarget.host}:${prodTarget.port}/${prodTarget.database}`;
  const testIdentity = `${testTarget.username}@${testTarget.host}:${testTarget.port}/${testTarget.database}`;

  if (prodIdentity === testIdentity) {
    throw new Error(
      "Database copy is blocked because production and test database targets are the same."
    );
  }
}

function runDumpRestorePipeline(
  dumpArgs: string[],
  restoreArgs: string[]
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

      const restoreFailed = restoreExitCode !== 0;
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

  ensureDistinctDatabaseTargets(prodDbUrl, testDbUrl);

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
    ["--dbname", testDbUrl, "-v", "ON_ERROR_STOP=0"]
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
