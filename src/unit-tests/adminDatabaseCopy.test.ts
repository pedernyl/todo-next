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
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test-ref.supabase.co";
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

  it("reports missing variables when test database variables are absent", () => {
    delete process.env.SUPABASE_TEST_DB_PASSWORD;
    delete process.env.SUPABASE_TEST_REF;
    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;

    expect(getDatabaseCopyAvailability()).toEqual({
      available: false,
      missingVariables: [
        "SUPABASE_TEST_REF or NEXT_PUBLIC_SUPABASE_TEST_URL",
        "SUPABASE_TEST_DB_PASSWORD",
      ],
    });
  });

  it("reports missing production database variables when absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_DB_PASSWORD;

    expect(getDatabaseCopyAvailability()).toEqual({
      available: false,
      missingVariables: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_DB_PASSWORD"],
    });
  });

  it("runs overwrite copy with clean restore arguments", async () => {
    await copyProductionDatabaseToTest("overwrite");

    const overwriteDumpArgs = spawnMock.mock.calls[0]?.[1] as string[];
    expect(overwriteDumpArgs).toEqual(expect.arrayContaining(["--schema", "public"]));

    const expectedProdDbUrl = "postgresql://postgres:prod-password@db.prod-ref.supabase.co:5432/postgres";
    const expectedTestDbUrl = "postgresql://postgres:test-password@db.test-ref.supabase.co:5432/postgres";

    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "pg_dump",
      expect.arrayContaining(["--clean", "--if-exists", "--dbname", expectedProdDbUrl]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "psql",
      ["--dbname", expectedTestDbUrl, "-v", "ON_ERROR_STOP=1"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
  });

  it("runs append copy with schema and data phases", async () => {
    await copyProductionDatabaseToTest("append");

    const appendSchemaDumpArgs = spawnMock.mock.calls[0]?.[1] as string[];
    expect(appendSchemaDumpArgs).toEqual(expect.arrayContaining(["--schema", "public"]));

    const appendDataDumpArgs = spawnMock.mock.calls[2]?.[1] as string[];
    expect(appendDataDumpArgs).toEqual(expect.arrayContaining(["--schema", "public"]));

    const expectedProdDbUrl = "postgresql://postgres:prod-password@db.prod-ref.supabase.co:5432/postgres";
    const expectedTestDbUrl = "postgresql://postgres:test-password@db.test-ref.supabase.co:5432/postgres";

    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "pg_dump",
      expect.arrayContaining(["--schema-only", "--dbname", expectedProdDbUrl]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "psql",
      ["--dbname", expectedTestDbUrl, "-v", "ON_ERROR_STOP=0"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      3,
      "pg_dump",
      expect.arrayContaining(["--data-only", "--on-conflict-do-nothing", "--dbname", expectedProdDbUrl]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      4,
      "psql",
      ["--dbname", expectedTestDbUrl, "-v", "ON_ERROR_STOP=1"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
  });

  it("uses NEXT_PUBLIC_SUPABASE_TEST_URL when SUPABASE_TEST_REF is missing", async () => {
    delete process.env.SUPABASE_TEST_REF;

    await copyProductionDatabaseToTest("overwrite");

    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "psql",
      ["--dbname", "postgresql://postgres:test-password@db.test-ref.supabase.co:5432/postgres", "-v", "ON_ERROR_STOP=1"],
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

  it("throws when append schema restore exits with non-zero status", async () => {
    spawnMock.mockImplementationOnce(() => createProcess());
    spawnMock.mockImplementationOnce(() => createProcess({ closeCode: 1 }));

    await expect(copyProductionDatabaseToTest("append")).rejects.toThrow("psql exited with 1");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("blocks copy when production and test urls resolve to the same target", async () => {
    process.env.SUPABASE_TEST_REF = "prod-ref";

    await expect(copyProductionDatabaseToTest("overwrite")).rejects.toThrow(
      "production and test database targets are the same"
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.com";

    await expect(copyProductionDatabaseToTest("overwrite")).rejects.toThrow(
      "Invalid NEXT_PUBLIC_SUPABASE_URL. Use a valid https://<project-ref>.supabase.co URL."
    );
  });
});
