import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function toImportIdentifier(fileName, index) {
  const withoutExtension = fileName.replace(/\.ts$/, "");
  const sanitized = withoutExtension.replace(/[^a-zA-Z0-9_$]/g, "_");
  const startsWithDigit = /^[0-9]/.test(sanitized);
  return `${startsWithDigit ? "update_" : "update"}_${sanitized}_${index}`;
}

export async function generateAdminUpdatesRegistry(projectRoot = process.cwd()) {
  const updatesDir = path.join(projectRoot, "src", "lib", "adminUpdates", "updates");
  const outputFile = path.join(updatesDir, "registry.generated.ts");
  const entries = await fs.readdir(updatesDir, { withFileTypes: true });

  const updateFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name.endsWith(".ts") &&
        name !== "registry.ts" &&
        name !== "registry.generated.ts" &&
        !name.endsWith(".d.ts")
    )
    .sort((a, b) => a.localeCompare(b));

  const importLines = updateFiles.map((fileName, index) => {
    const importIdentifier = toImportIdentifier(fileName, index);
    const modulePath = `./${fileName.replace(/\.ts$/, "")}`;
    return { importIdentifier, line: `import * as ${importIdentifier} from "${modulePath}";` };
  });

  const registryEntries = updateFiles.map((fileName, index) => {
    const importIdentifier = importLines[index]?.importIdentifier;
    return `  {\n    fileName: "${fileName}",\n    module: ${importIdentifier},\n  },`;
  });

  const generatedContent = [
    "/* eslint-disable */",
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    "// Run: npm run generate:admin-updates",
    "",
    ...importLines.map((entry) => entry.line),
    "import type { RegisteredAdminUpdate } from \"./registry\";",
    "",
    "export const adminUpdateRegistry: RegisteredAdminUpdate[] = [",
    ...registryEntries,
    "];",
    "",
  ].join("\n");

  await fs.writeFile(outputFile, generatedContent, "utf8");
  return { outputFile, count: updateFiles.length };
}

async function runCli() {
  const result = await generateAdminUpdatesRegistry();
  console.log(
    `Generated ${path.relative(process.cwd(), result.outputFile)} with ${result.count} update module(s).`
  );
}

const thisFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFilePath) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
