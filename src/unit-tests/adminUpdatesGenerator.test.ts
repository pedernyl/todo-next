import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

async function createTempProjectWithUpdates() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "admin-updates-generator-"));
  const updatesDir = path.join(rootDir, "src", "lib", "adminUpdates", "updates");
  await mkdir(updatesDir, { recursive: true });

  await writeFile(
    path.join(updatesDir, "registry.ts"),
    "export type RegisteredAdminUpdate = { fileName: string; module: unknown };\n",
    "utf8"
  );

  // Dummy no-op update used to verify generation picks up new update modules.
  await writeFile(
    path.join(updatesDir, "dummyNoOp_1900000000.ts"),
    "export async function runAdminUpdate() { return { message: 'noop' }; }\n",
    "utf8"
  );

  await writeFile(
    path.join(updatesDir, "anotherUpdate_1800000000.ts"),
    "export default async function runAdminUpdate() { return { message: 'another' }; }\n",
    "utf8"
  );

  await writeFile(path.join(updatesDir, "ignore-me.d.ts"), "export {};\n", "utf8");

  return { rootDir, updatesDir };
}

describe("generate-admin-updates-registry script", () => {
  it("generates registry.generated.ts and includes a dummy no-op update", async () => {
    const { rootDir, updatesDir } = await createTempProjectWithUpdates();

    try {
      const scriptPath = path.join(process.cwd(), "scripts", "generate-admin-updates-registry.mjs");
      const moduleUrl = pathToFileURL(scriptPath).href;
      const scriptModule = (await import(moduleUrl)) as {
        generateAdminUpdatesRegistry: (projectRoot?: string) => Promise<{ outputFile: string; count: number }>;
      };

      const result = await scriptModule.generateAdminUpdatesRegistry(rootDir);
      expect(result.count).toBe(2);

      const generatedPath = path.join(updatesDir, "registry.generated.ts");
      const generatedContent = await readFile(generatedPath, "utf8");

      expect(generatedContent).toContain(
        'import * as update_anotherUpdate_1800000000_0 from "./anotherUpdate_1800000000";'
      );
      expect(generatedContent).toContain(
        'import * as update_dummyNoOp_1900000000_1 from "./dummyNoOp_1900000000";'
      );
      expect(generatedContent).toContain('fileName: "dummyNoOp_1900000000.ts"');
      expect(generatedContent).not.toContain("ignore-me.d.ts");
      expect(generatedContent).not.toContain("registry.ts");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
