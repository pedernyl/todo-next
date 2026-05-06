import { afterEach, describe, expect, it } from "vitest";

import { getDevTitle, isTestDbActive } from "../lib/environmentMode";

type EnvSnapshot = {
  TEST_DB_ACTIVE: string | undefined;
  NEXT_PUBLIC_SUPABASE_TEST_URL: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  NODE_ENV: string | undefined;
};

function readTrackedEnv(): EnvSnapshot {
  return {
    TEST_DB_ACTIVE: process.env.TEST_DB_ACTIVE,
    NEXT_PUBLIC_SUPABASE_TEST_URL: process.env.NEXT_PUBLIC_SUPABASE_TEST_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
}

function writeTrackedEnv(env: EnvSnapshot): void {
  if (env.TEST_DB_ACTIVE === undefined) {
    delete process.env.TEST_DB_ACTIVE;
  } else {
    process.env.TEST_DB_ACTIVE = env.TEST_DB_ACTIVE;
  }

  if (env.NEXT_PUBLIC_SUPABASE_TEST_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = env.NEXT_PUBLIC_SUPABASE_TEST_URL;
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (env.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = env.NODE_ENV;
  }
}

const originalEnv = readTrackedEnv();

afterEach(() => {
  writeTrackedEnv(originalEnv);
});

describe("isTestDbActive", () => {
  it("returns true when TEST_DB_ACTIVE is true even if URLs differ", () => {
    process.env.TEST_DB_ACTIVE = "true";
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test.example";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example";

    expect(isTestDbActive()).toBe(true);
  });

  it("returns true when TEST and runtime URLs are equal and override is not set", () => {
    delete process.env.TEST_DB_ACTIVE;
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://same.example";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://same.example";

    expect(isTestDbActive()).toBe(true);
  });

  it("returns false when override is not true and URLs differ", () => {
    process.env.TEST_DB_ACTIVE = "false";
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test.example";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example";

    expect(isTestDbActive()).toBe(false);
  });

  it("returns true when TEST_DB_ACTIVE is false but URLs are equal", () => {
    process.env.TEST_DB_ACTIVE = "false";
    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://same.example";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://same.example";

    expect(isTestDbActive()).toBe(true);
  });

  it("returns false when one or both URLs are missing", () => {
    delete process.env.TEST_DB_ACTIVE;
    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(isTestDbActive()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_TEST_URL = "https://test.example";
    expect(isTestDbActive()).toBe(false);

    delete process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example";
    expect(isTestDbActive()).toBe(false);
  });
});

describe("getDevTitle", () => {
  it("adds the test suffix when TEST_DB_ACTIVE is true", () => {
    process.env.TEST_DB_ACTIVE = "true";
    expect(getDevTitle("Admin")).toBe("Admin - TEST DB");
  });

  it("returns the base title when TEST_DB_ACTIVE is not true", () => {
    delete process.env.TEST_DB_ACTIVE;
    process.env.NODE_ENV = "development";

    expect(getDevTitle("Admin")).toBe("Admin");
  });
});
