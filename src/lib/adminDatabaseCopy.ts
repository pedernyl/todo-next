import { spawn } from "node:child_process";

export type DatabaseCopyMode = "overwrite" | "append";

type CopyAvailability = {
  available: boolean;
  missingVariables: string[];
};

type DatabaseTarget = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
};

function parseProjectRefFromSupabaseUrl(urlValue: string, envVarName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    throw new Error(
      `Invalid ${envVarName}. Use a valid https://<project-ref>.supabase.co URL.`
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Invalid ${envVarName}. Use a valid https://<project-ref>.supabase.co URL.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith(".supabase.co")) {
    throw new Error(
      `Invalid ${envVarName}. Use a valid https://<project-ref>.supabase.co URL.`
    );
  }

  const projectRef = hostname.replace(/\.supabase\.co$/, "");
  if (!projectRef) {
    throw new Error(
      `Invalid ${envVarName}. Use a valid https://<project-ref>.supabase.co URL.`
    );
  }

  return projectRef;
}

function buildSupabaseDatabaseTarget(projectRef: string, password: string): DatabaseTarget {
  return {
    host: `db.${projectRef}.supabase.co`,
    port: "5432",
    database: "postgres",
    username: "postgres",
    password,
  };
}

function getProdDbTarget(): DatabaseTarget | undefined {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    return undefined;
  }

  const projectRef = parseProjectRefFromSupabaseUrl(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  return buildSupabaseDatabaseTarget(projectRef, dbPassword);
}

function getTestDbTarget(): DatabaseTarget | undefined {
  const dbPassword = process.env.SUPABASE_TEST_DB_PASSWORD;
  if (!dbPassword) {
    return undefined;
  }

  if (process.env.SUPABASE_TEST_REF) {
    return buildSupabaseDatabaseTarget(process.env.SUPABASE_TEST_REF.toLowerCase(), dbPassword);
  }

  const testSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  if (!testSupabaseUrl) {
    return undefined;
  }

  const projectRef = parseProjectRefFromSupabaseUrl(
    testSupabaseUrl,
    "NEXT_PUBLIC_SUPABASE_TEST_URL"
  );
  return buildSupabaseDatabaseTarget(projectRef, dbPassword);
}

export function getDatabaseCopyAvailability(): CopyAvailability {
  const missingVariables: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_DB_PASSWORD) {
    missingVariables.push("SUPABASE_DB_PASSWORD");
  }

  if (!process.env.SUPABASE_TEST_REF && !process.env.NEXT_PUBLIC_SUPABASE_TEST_URL) {
    missingVariables.push("SUPABASE_TEST_REF or NEXT_PUBLIC_SUPABASE_TEST_URL");
  }
  if (!process.env.SUPABASE_TEST_DB_PASSWORD) {
    missingVariables.push("SUPABASE_TEST_DB_PASSWORD");
  }

  return {
    available: missingVariables.length === 0,
    missingVariables,
  };
}

function buildPgConnectionArgs(target: DatabaseTarget): string[] {
  return [
    "--host",
    target.host,
    "--port",
    target.port,
    "--username",
    target.username,
    "--dbname",
    target.database,
  ];
}

function buildPgEnv(password: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: password,
    PGSSLMODE: "require",
  };
}

function ensureDistinctDatabaseTargets(prodTarget: DatabaseTarget, testTarget: DatabaseTarget): void {
  const prodIdentity = `${prodTarget.username.toLowerCase()}@${prodTarget.host.toLowerCase()}:${prodTarget.port}/${prodTarget.database.toLowerCase()}`;
  const testIdentity = `${testTarget.username.toLowerCase()}@${testTarget.host.toLowerCase()}:${testTarget.port}/${testTarget.database.toLowerCase()}`;

  if (prodIdentity === testIdentity) {
    throw new Error(
      "Database copy is blocked because production and test database targets are the same."
    );
  }
}

function runDumpRestorePipeline(
  dumpArgs: string[],
  restoreArgs: string[],
  dumpEnv: NodeJS.ProcessEnv,
  restoreEnv: NodeJS.ProcessEnv
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dumper = spawn("pg_dump", dumpArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      env: dumpEnv,
    });
    const restorer = spawn("psql", restoreArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: restoreEnv,
    });

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

function runPsqlCommand(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("psql", args, { stdio: ["ignore", "pipe", "pipe"], env });
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

async function applySupabasePublicSchemaGrants(target: DatabaseTarget): Promise<void> {
  const grantSql = [
    "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;",
    "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;",
    "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;",
    "GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;",
  ].join(" ");

  await runPsqlCommand(
    [...buildPgConnectionArgs(target), "-v", "ON_ERROR_STOP=1", "-c", grantSql],
    buildPgEnv(target.password)
  );
}

export async function copyProductionDatabaseToTest(mode: DatabaseCopyMode): Promise<void> {
  const prodDbTarget = getProdDbTarget();
  const testDbTarget = getTestDbTarget();
  const availability = getDatabaseCopyAvailability();

  if (!prodDbTarget || !testDbTarget || !availability.available) {
    throw new Error(
      `Database copy is not available. Missing variables: ${availability.missingVariables.join(", ")}`
    );
  }

  ensureDistinctDatabaseTargets(prodDbTarget, testDbTarget);

  if (mode === "overwrite") {
    await runDumpRestorePipeline(
      [
        "--schema",
        "public",
        "--no-owner",
        "--no-acl",
        "--clean",
        "--if-exists",
        ...buildPgConnectionArgs(prodDbTarget),
      ],
      [...buildPgConnectionArgs(testDbTarget), "-v", "ON_ERROR_STOP=1"],
      buildPgEnv(prodDbTarget.password),
      buildPgEnv(testDbTarget.password)
    );
    await applySupabasePublicSchemaGrants(testDbTarget);
    return;
  }

  await runDumpRestorePipeline(
    [
      "--schema-only",
      "--schema",
      "public",
      "--no-owner",
      "--no-acl",
      ...buildPgConnectionArgs(prodDbTarget),
    ],
    [...buildPgConnectionArgs(testDbTarget), "-v", "ON_ERROR_STOP=0"],
    buildPgEnv(prodDbTarget.password),
    buildPgEnv(testDbTarget.password)
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
      ...buildPgConnectionArgs(prodDbTarget),
    ],
    [...buildPgConnectionArgs(testDbTarget), "-v", "ON_ERROR_STOP=1"],
    buildPgEnv(prodDbTarget.password),
    buildPgEnv(testDbTarget.password)
  );

  await applySupabasePublicSchemaGrants(testDbTarget);
}
