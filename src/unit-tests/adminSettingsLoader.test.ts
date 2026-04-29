import { describe, expect, it } from "vitest";
import { parseAdminSettingsDefinitionYaml } from "../lib/adminSettings/loader";

describe("adminSettings loader", () => {
  it("parses valid YAML definition", () => {
    const parsed = parseAdminSettingsDefinitionYaml(
      `name: app\ntype: App\nfields:\n  - key: appName\n    label: App Name\n    type: text\n  - key: mode\n    label: Mode\n    type: select\n    options:\n      - label: Basic\n        value: basic`,
      "app.yaml"
    );

    expect(parsed.name).toBe("app");
    expect(parsed.type).toBe("App");
    expect(parsed.fields).toHaveLength(2);
    expect(parsed.fields[1].type).toBe("select");
  });

  it("rejects unsupported field type", () => {
    expect(() =>
      parseAdminSettingsDefinitionYaml(
        `name: app\ntype: App\nfields:\n  - key: flag\n    label: Flag\n    type: unknown`,
        "invalid.yaml"
      )
    ).toThrow("Unsupported field type");
  });

  it("rejects select field without options", () => {
    expect(() =>
      parseAdminSettingsDefinitionYaml(
        `name: app\ntype: App\nfields:\n  - key: mode\n    label: Mode\n    type: select`,
        "invalid-select.yaml"
      )
    ).toThrow("must define non-empty options");
  });
});
