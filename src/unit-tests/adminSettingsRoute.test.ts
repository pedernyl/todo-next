import { describe, expect, it } from "vitest";
import { groupAdminSettingsByType } from "../lib/adminSettings/service";

describe("admin settings grouped response shape", () => {
  it("groups settings under a type key with settings array", () => {
    const grouped = groupAdminSettingsByType([
      {
        id: 1,
        name: "app",
        type: "App",
        title: "App Settings",
        description: "",
        fields: [],
        values: {},
        changedBy: null,
        changedTimestamp: null,
      },
      {
        id: 2,
        name: "debug",
        type: "Debug",
        title: "Debug Settings",
        description: "",
        fields: [],
        values: {},
        changedBy: null,
        changedTimestamp: null,
      },
    ]);

    expect(Array.isArray(grouped)).toBe(true);
    expect(grouped[0]).toMatchObject({ type: "App" });
    expect(Array.isArray(grouped[0].settings)).toBe(true);
    expect(grouped[1]).toMatchObject({ type: "Debug" });
    expect(Array.isArray(grouped[1].settings)).toBe(true);
  });
});
