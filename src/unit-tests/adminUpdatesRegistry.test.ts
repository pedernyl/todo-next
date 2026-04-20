import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adminUpdateRegistry } from "../lib/adminUpdates/updates/registry";

function normalizeFileList(fileNames: string[]) {
  return [...fileNames].sort((a, b) => a.localeCompare(b));
}

describe("admin update registry", () => {
  it("contains one entry for every update file on disk", async () => {
    const updatesDir = path.join(process.cwd(), "src", "lib", "adminUpdates", "updates");
    const filesOnDisk = await readdir(updatesDir);

    const updateFilesOnDisk = filesOnDisk.filter(
      (fileName) =>
        fileName.endsWith(".ts") &&
        fileName !== "registry.ts" &&
        fileName !== "registry.generated.ts"
    );

    const registeredFiles = adminUpdateRegistry.map((entry) => entry.fileName);

    expect(normalizeFileList(registeredFiles)).toEqual(normalizeFileList(updateFilesOnDisk));
  });

  it("does not contain duplicate file names", () => {
    const registeredFiles = adminUpdateRegistry.map((entry) => entry.fileName);
    const unique = new Set(registeredFiles);

    expect(unique.size).toBe(registeredFiles.length);
  });
});
