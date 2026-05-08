import { beforeEach, describe, expect, it, vi } from "vitest";

const { testState } = vi.hoisted(() => ({
  testState: {
    settingsRowsByType: new Map<string, { settings: Record<string, unknown> }>(),
    queryError: null as null | { message: string },
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("../lib/supabaseAdminClient", () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const filters: Record<string, string> = {};
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          filters[column] = value;
          return builder;
        },
        maybeSingle: async () => {
          if (testState.queryError) {
            return { data: null, error: testState.queryError };
          }
          return { data: testState.settingsRowsByType.get(filters.type) ?? null, error: null };
        },
      };
      return builder;
    }),
  },
}));

import { getAppSettings } from "../lib/appSettings";

describe("getAppSettings", () => {
  beforeEach(() => {
    testState.settingsRowsByType = new Map();
    testState.queryError = null;
  });

  it("returns default app name when no row exists", async () => {
    const settings = await getAppSettings();
    expect(settings.appName).toBe("Todo App");
  });

  it("returns current App type value when present", async () => {
    testState.settingsRowsByType.set("App", { settings: { appName: "Current Name" } });
    const settings = await getAppSettings();
    expect(settings.appName).toBe("Current Name");
  });

  it("falls back to legacy lowercase type when App type is missing", async () => {
    testState.settingsRowsByType.set("app", { settings: { appName: "Legacy Name" } });
    const settings = await getAppSettings();
    expect(settings.appName).toBe("Legacy Name");
  });

  it("falls back to default when query errors", async () => {
    testState.queryError = { message: "connection refused" };
    const settings = await getAppSettings();
    expect(settings.appName).toBe("Todo App");
  });

  it("falls back to default when stored appName is invalid", async () => {
    testState.settingsRowsByType.set("App", { settings: { appName: 123 } });
    const settings = await getAppSettings();
    expect(settings.appName).toBe("Todo App");
  });
});
