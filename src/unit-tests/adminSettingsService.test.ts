import { beforeEach, describe, expect, it, vi } from "vitest";

const { testState } = vi.hoisted(() => ({
  testState: {
    settingsRows: [] as Array<{
      id: number;
      name: string;
      type: string;
      settings: Record<string, unknown>;
      changed_by: number | null;
      changed_timestamp: string | null;
    }>,
    nextSettingsId: 1,
    usersByEmail: new Map<string, number>([["admin@example.com", 7]]),
  },
}));

vi.mock("../lib/adminSettings/loader", () => ({
  loadAdminSettingsDefinitions: vi.fn(async () => [
    {
      name: "app",
      type: "App",
      title: "App Settings",
      description: "Core app",
      fields: [
        { key: "appName", label: "App Name", type: "text", default: "Todo Next" },
        { key: "allowRegistrations", label: "Allow Registrations", type: "boolean", default: true },
      ],
    },
    {
      name: "debug",
      type: "Debug",
      title: "Debug Settings",
      fields: [{ key: "debugEnabled", label: "Debug Enabled", type: "boolean", default: false }],
    },
  ]),
}));

vi.mock("../lib/supabaseAdminClient", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "Users") {
        return {
          select: () => ({
            eq: (_column: string, email: string) => ({
              single: async () => {
                const id = testState.usersByEmail.get(email);
                if (!id) {
                  return { data: null, error: { message: "not found" } };
                }

                return { data: { id }, error: null };
              },
            }),
          }),
        };
      }

      if (table === "Settings") {
        return {
          select: (_columns: string) => {
            const filters: Record<string, string> = {};

            const builder = {
              eq: (column: string, value: string) => {
                filters[column] = value;
                return builder;
              },
              maybeSingle: async () => {
                const row = testState.settingsRows.find(
                  (item) => item.name === filters.name && item.type === filters.type
                );

                if (!row) {
                  return { data: null, error: null };
                }

                return { data: { id: row.id }, error: null };
              },
              single: async () => {
                const row = testState.settingsRows.find(
                  (item) => item.name === filters.name && item.type === filters.type
                );

                if (!row) {
                  return { data: null, error: { message: "missing row" } };
                }

                return { data: row, error: null };
              },
              then: (resolve: (value: unknown) => unknown) => {
                return resolve({ data: testState.settingsRows, error: null });
              },
            };

            return builder;
          },
          update: (payload: Record<string, unknown>) => ({
            eq: async (_column: string, id: number) => {
              const row = testState.settingsRows.find((item) => item.id === id);
              if (!row) {
                return { error: { message: "missing row" } };
              }

              row.settings = payload.settings as Record<string, unknown>;
              row.changed_by = payload.changed_by as number;
              row.changed_timestamp = payload.changed_timestamp as string;
              return { error: null };
            },
          }),
          insert: async (payload: Record<string, unknown>) => {
            testState.settingsRows.push({
              id: testState.nextSettingsId,
              name: payload.name as string,
              type: payload.type as string,
              settings: payload.settings as Record<string, unknown>,
              changed_by: payload.changed_by as number,
              changed_timestamp: payload.changed_timestamp as string,
            });
            testState.nextSettingsId += 1;
            return { error: null };
          },
        };
      }

      return {};
    }),
  },
}));

import { loadAdminSettingsGrouped, saveAdminSettingGroup } from "../lib/adminSettings/service";

describe("admin settings service", () => {
  beforeEach(() => {
    testState.settingsRows = [];
    testState.nextSettingsId = 1;
  });

  it("loads grouped settings with YAML defaults", async () => {
    const groups = await loadAdminSettingsGrouped();

    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("App");
    expect(groups[1].type).toBe("Debug");

    const appGroup = groups[0].settings[0];
    expect(appGroup.values.appName).toBe("Todo Next");
    expect(appGroup.values.allowRegistrations).toBe(true);
  });

  it("saves settings and writes changed_by and changed_timestamp", async () => {
    const saved = await saveAdminSettingGroup({
      name: "app",
      type: "App",
      settings: {
        appName: "New Name",
        allowRegistrations: false,
      },
      changedByEmail: "admin@example.com",
    });

    expect(saved.changedBy).toBe(7);
    expect(saved.changedTimestamp).toBeTruthy();
    expect(testState.settingsRows).toHaveLength(1);
    expect(testState.settingsRows[0].changed_by).toBe(7);
    expect(testState.settingsRows[0].changed_timestamp).toBeTruthy();
  });

  it("loads persisted values after save", async () => {
    await saveAdminSettingGroup({
      name: "debug",
      type: "Debug",
      settings: {
        debugEnabled: true,
      },
      changedByEmail: "admin@example.com",
    });

    const groups = await loadAdminSettingsGrouped();
    const debugGroup = groups.find((group) => group.type === "Debug")?.settings[0];

    expect(debugGroup).toBeDefined();
    expect(debugGroup?.values.debugEnabled).toBe(true);
  });
});
