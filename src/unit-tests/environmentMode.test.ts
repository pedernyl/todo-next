import { afterEach, describe, expect, it } from "vitest";

import { getDevTitle, isTestDbActive } from "../lib/environmentMode";

type EnvSnapshot = {
  TEST_DB_ACTIVE: string | undefined;
  NEXT_PUBLIC_SUPABASE_TEST_URL: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  NODE_ENV: string | undefined;
};

const runtimeEnv = process.env as Record<string, string | undefined>;

function readTrackedEnv(): EnvSnapshot {
  return {
    TEST_DB_ACTIVE: runtimeEnv.TEST_DB_ACTIVE,
    NEXT_PUBLIC_SUPABASE_TEST_URL: runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL,
    NEXT_PUBLIC_SUPABASE_URL: runtimeEnv.NEXT_PUBLIC_SUPABASE_URL,
    NODE_ENV: runtimeEnv.NODE_ENV,
  };
}

function writeTrackedEnv(env: EnvSnapshot): void {
  if (env.TEST_DB_ACTIVE === undefined) {
    delete runtimeEnv.TEST_DB_ACTIVE;
  } else {
    runtimeEnv.TEST_DB_ACTIVE = env.TEST_DB_ACTIVE;
  }

  if (env.NEXT_PUBLIC_SUPABASE_TEST_URL === undefined) {
    delete runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL;
  } else {
    runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL = env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
    delete runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (env.NODE_ENV === undefined) {
    delete runtimeEnv.NODE_ENV;
  } else {
    runtimeEnv.NODE_ENV = env.NODE_ENV;
  }
}

const originalEnv = readTrackedEnv();

afterEach(() => {
  writeTrackedEnv(originalEnv);
});

describe("isTestDbActive", () => {
  it("returns true when TEST_DB_ACTIVE is true even if URLs differ", () => {
    runtimeEnv.TEST_DB_ACTIVE = "true";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test.example";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example";

    expect(isTestDbActive()).toBe(true);
  });

  it("returns true when TEST and runtime URLs are equal and override is not set", () => {
    delete runtimeEnv.TEST_DB_ACTIVE;
    runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://same.example";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL = "https://same.example";

    expect(isTestDbActive()).toBe(true);
  });

  it("returns false when override is not true and URLs differ", () => {
    runtimeEnv.TEST_DB_ACTIVE = "false";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test.example";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example";

    expect(isTestDbActive()).toBe(false);
  });

  it("returns true when TEST_DB_ACTIVE is false but URLs are equal", () => {
    runtimeEnv.TEST_DB_ACTIVE = "false";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://same.example";
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL = "https://same.example";

    expect(isTestDbActive()).toBe(true);
  });

  it("returns false when one or both URLs are missing", () => {
    delete runtimeEnv.TEST_DB_ACTIVE;
    delete runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL;
    delete runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;

    expect(isTestDbActive()).toBe(false);

    runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test.example";
    expect(isTestDbActive()).toBe(false);

    delete runtimeEnv.NEXT_PUBLIC_SUPABASE_TEST_URL;
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example";
    expect(isTestDbActive()).toBe(false);
  });
});

describe("getDevTitle", () => {
  it("adds the test suffix when TEST_DB_ACTIVE is true", () => {
    runtimeEnv.TEST_DB_ACTIVE = "true";
    expect(getDevTitle("Admin")).toBe("Admin - TEST DB");
  });

  it("returns the base title when TEST_DB_ACTIVE is not true", () => {
    delete runtimeEnv.TEST_DB_ACTIVE;
    runtimeEnv.NODE_ENV = "development";

    expect(getDevTitle("Admin")).toBe("Admin");
  });
});
