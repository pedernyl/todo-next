import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
  default: { spawn: spawnMock },
}));

import {
  copyProductionDatabaseToTest,
  getDatabaseCopyAvailability,
} from "../lib/adminDatabaseCopy";

function createProcess(options?: { closeCode?: number; emitError?: Error }) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: { pipe: ReturnType<typeof vi.fn> };
    stderr: EventEmitter;
    stdin: Record<string, never>;
  };
  proc.stdout = { pipe: vi.fn() };
  proc.stderr = new EventEmitter();
  proc.stdin = {};

  queueMicrotask(() => {
    if (options?.emitError) {
      proc.emit("error", options.emitError);
      return;
    }

    proc.emit("close", options?.closeCode ?? 0);
  });

  return proc;
}

describe("adminDatabaseCopy", () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_TEST_URL: process.env.NEXT_PUBLIC_SUPABASE_TEST_URL,
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
    SUPABASE_TEST_DB_PASSWORD: process.env.SUPABASE_TEST_DB_PASSWORD,
    SUPABASE_TEST_REF: process.env.SUPABASE_TEST_REF,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "postgres://prod-db";
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "postgres://test-db";
    process.env.SUPABASE_DB_PASSWORD = "prod-password";
    process.env.SUPABASE_TEST_DB_PASSWORD = "test-password";
    process.env.SUPABASE_TEST_REF = "test-ref";
    spawnMock.mockImplementation(() => createProcess());
  });

  afterEach(() => {
    if (originalEnv.NEXT_PUBLIC_SUPABASE_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;

    if (originalEnv.NEXT_PUBLIC_SUPABASE_TEST_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = originalEnv.NEXT_PUBLIC_SUPABASE_TEST_URL;

    if (originalEnv.SUPABASE_DB_PASSWORD === undefined) delete process.env.SUPABASE_DB_PASSWORD;
    else process.env.SUPABASE_DB_PASSWORD = originalEnv.SUPABASE_DB_PASSWORD;

    if (originalEnv.SUPABASE_TEST_DB_PASSWORD === undefined) delete process.env.SUPABASE_TEST_DB_PASSWORD;
    else process.env.SUPABASE_TEST_DB_PASSWORD = originalEnv.SUPABASE_TEST_DB_PASSWORD;

    if (originalEnv.SUPABASE_TEST_REF === undefined) delete process.env.SUPABASE_TEST_REF;
    else process.env.SUPABASE_TEST_REF = originalEnv.SUPABASE_TEST_REF;
  });

  it("reports missing variables when test db url is absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;

    expect(getDatabaseCopyAvailability()).toEqual({
      available: false,
      missingVariables: ["NEXT_PUBLIC_SUPABASE_TEST_URL"],
    });
  });

  it("reports missing password variables when absent", () => {
    delete process.env.SUPABASE_DB_PASSWORD;
    delete process.env.SUPABASE_TEST_DB_PASSWORD;

    expect(getDatabaseCopyAvailability()).toEqual({
      available: false,
      missingVariables: ["SUPABASE_DB_PASSWORD", "SUPABASE_TEST_DB_PASSWORD"],
    });
  });

  it("runs overwrite copy with clean restore arguments", async () => {
    await copyProductionDatabaseToTest("overwrite");

    const overwriteDumpArgs = spawnMock.mock.calls[0]?.[1] as string[];
    expect(overwriteDumpArgs).toEqual(expect.arrayContaining(["--schema", "public"]));

    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "pg_dump",
      expect.arrayContaining(["--clean", "--if-exists", "--dbname", "postgres://prod-db"]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "psql",
      ["--dbname", "postgres://test-db", "-v", "ON_ERROR_STOP=1"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
  });

  it("runs append copy with schema and data phases", async () => {
    await copyProductionDatabaseToTest("append");

    const appendSchemaDumpArgs = spawnMock.mock.calls[0]?.[1] as string[];
    expect(appendSchemaDumpArgs).toEqual(expect.arrayContaining(["--schema", "public"]));

    const appendDataDumpArgs = spawnMock.mock.calls[2]?.[1] as string[];
    expect(appendDataDumpArgs).toEqual(expect.arrayContaining(["--schema", "public"]));

    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "pg_dump",
      expect.arrayContaining(["--schema-only", "--dbname", "postgres://prod-db"]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "psql",
      ["--dbname", "postgres://test-db", "-v", "ON_ERROR_STOP=0"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      3,
      "pg_dump",
      expect.arrayContaining(["--data-only", "--on-conflict-do-nothing", "--dbname", "postgres://prod-db"]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      4,
      "psql",
      ["--dbname", "postgres://test-db", "-v", "ON_ERROR_STOP=1"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
  });

  it("throws when pg_dump exits with a non-zero status", async () => {
    spawnMock.mockImplementationOnce(() => createProcess({ closeCode: 1 }));
    spawnMock.mockImplementationOnce(() => createProcess());

    await expect(copyProductionDatabaseToTest("overwrite")).rejects.toThrow(
      "pg_dump exited with 1"
    );
  });

  it("throws when psql process fails to start", async () => {
    spawnMock.mockImplementationOnce(() => createProcess());
    spawnMock.mockImplementationOnce(() => createProcess({ emitError: new Error("spawn failed") }));

    await expect(copyProductionDatabaseToTest("overwrite")).rejects.toThrow(
      "Failed to run psql: spawn failed"
    );
  });

  it("converts Supabase URLs to Postgres URLs for copy commands", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prodproj.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://testproj.supabase.co";
    process.env.SUPABASE_DB_PASSWORD = "prod pass";
    process.env.SUPABASE_TEST_DB_PASSWORD = "test pass";
    delete process.env.SUPABASE_TEST_REF;

    await copyProductionDatabaseToTest("overwrite");

    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "pg_dump",
      expect.arrayContaining([
        "--dbname",
        "postgresql://postgres:prod%20pass@db.prodproj.supabase.co:5432/postgres?sslmode=require",
      ]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "psql",
      [
        "--dbname",
        "postgresql://postgres:test%20pass@db.testproj.supabase.co:5432/postgres?sslmode=require",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
  });
});
