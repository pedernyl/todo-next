import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  loadAdminSettingsDefinitions,
  parseAdminSettingsDefinitionYaml,
} from "../lib/adminSettings/loader";

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

  it("ignores example.* YAML files when loading definitions", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "admin-settings-loader-"));

    try {
      await writeFile(
        path.join(tmpDir, "app.yaml"),
        `name: app\ntype: App\nfields:\n  - key: appName\n    label: App Name\n    type: text`,
        "utf-8"
      );

      await writeFile(
        path.join(tmpDir, "example.app.yaml"),
        `name: appExample\ntype: App\nfields:\n  - key: allowRegistrations\n    label: Allow Registrations\n    type: boolean\n    default: true`,
        "utf-8"
      );

      const definitions = await loadAdminSettingsDefinitions(tmpDir);
      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe("app");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
