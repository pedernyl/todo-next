import { mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import YAML from "yaml";
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

  it("validates all settings YAML files have a capitalized type field", async () => {
    const settingsDir = path.join(process.cwd(), "src", "app", "admin", "settings");
    const entries = await readdir(settingsDir, { withFileTypes: true });

    const yamlFiles = entries
      .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of yamlFiles) {
      const filePath = path.join(settingsDir, fileName);
      const rawYaml = await readFile(filePath, "utf-8");
      const parsed = YAML.parse(rawYaml) as { type?: unknown } | null;
      const type = parsed?.type;

      if (typeof type !== "string" || !type.trim()) {
        throw new Error(`Missing required "type" field in ${fileName}`);
      }

      if (!/^[A-Z]/.test(type)) {
        throw new Error(
          `Invalid "type" in ${fileName}: expected value starting with a capital letter, received "${type}"`
        );
      }
    }
  });
});
