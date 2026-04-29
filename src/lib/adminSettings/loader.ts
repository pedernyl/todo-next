import { readdir, readFile } from "fs/promises";
import path from "path";
import YAML from "yaml";
import type {
  AdminSettingFieldDefinition,
  AdminSettingFieldType,
  AdminSettingsDefinition,
} from "./types";

const supportedFieldTypes: ReadonlySet<AdminSettingFieldType> = new Set([
  "text",
  "boolean",
  "number",
  "textarea",
  "select",
]);

function isSupportedFieldType(value: unknown): value is AdminSettingFieldType {
  return typeof value === "string" && supportedFieldTypes.has(value as AdminSettingFieldType);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFieldDefinition(
  candidate: unknown,
  fileName: string,
  index: number,
  seenKeys: Set<string>
): AdminSettingFieldDefinition {
  if (!isPlainObject(candidate)) {
    throw new Error(`Invalid field at index ${index} in ${fileName}: expected object`);
  }

  const key = candidate.key;
  const label = candidate.label;
  const type = candidate.type;

  if (typeof key !== "string" || !key.trim()) {
    throw new Error(`Invalid field key at index ${index} in ${fileName}`);
  }

  if (seenKeys.has(key)) {
    throw new Error(`Duplicate field key \"${key}\" in ${fileName}`);
  }

  if (typeof label !== "string" || !label.trim()) {
    throw new Error(`Invalid field label for key \"${key}\" in ${fileName}`);
  }

  if (!isSupportedFieldType(type)) {
    throw new Error(`Unsupported field type for key \"${key}\" in ${fileName}`);
  }

  const fieldType = type;

  const field: AdminSettingFieldDefinition = {
    key,
    label,
    type: fieldType,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    placeholder: typeof candidate.placeholder === "string" ? candidate.placeholder : undefined,
    default: candidate.default,
  };

  if (typeof candidate.min === "number") {
    field.min = candidate.min;
  }
  if (typeof candidate.max === "number") {
    field.max = candidate.max;
  }
  if (typeof candidate.step === "number") {
    field.step = candidate.step;
  }

  if (fieldType === "select") {
    const options = candidate.options;
    if (!Array.isArray(options) || options.length === 0) {
      throw new Error(`Select field \"${key}\" in ${fileName} must define non-empty options`);
    }

    field.options = options.map((option, optionIndex) => {
      if (!isPlainObject(option)) {
        throw new Error(`Invalid option at index ${optionIndex} for field \"${key}\" in ${fileName}`);
      }

      const optionLabel = option.label;
      const optionValue = option.value;
      if (typeof optionLabel !== "string" || typeof optionValue !== "string") {
        throw new Error(
          `Invalid option at index ${optionIndex} for field \"${key}\" in ${fileName}`
        );
      }

      return { label: optionLabel, value: optionValue };
    });
  }

  seenKeys.add(key);
  return field;
}

export function parseAdminSettingsDefinitionYaml(
  rawYaml: string,
  fileName = "(unknown)"
): AdminSettingsDefinition {
  let parsed: unknown;
  try {
    parsed = YAML.parse(rawYaml);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YAML parse error";
    throw new Error(`Invalid YAML in ${fileName}: ${message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Invalid settings schema in ${fileName}: expected object at root`);
  }

  const name = parsed.name;
  const type = parsed.type;
  const title = parsed.title;
  const description = parsed.description;
  const fields = parsed.fields;

  if (typeof name !== "string" || !name.trim()) {
    throw new Error(`Invalid or missing \"name\" in ${fileName}`);
  }

  if (typeof type !== "string" || !type.trim()) {
    throw new Error(`Invalid or missing \"type\" in ${fileName}`);
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error(`Invalid or missing \"fields\" in ${fileName}`);
  }

  const seenKeys = new Set<string>();
  const validatedFields = fields.map((field, index) =>
    validateFieldDefinition(field, fileName, index, seenKeys)
  );

  return {
    name,
    type,
    title: typeof title === "string" ? title : undefined,
    description: typeof description === "string" ? description : undefined,
    fields: validatedFields,
  };
}

export const defaultAdminSettingsDefinitionsDir = path.join(
  process.cwd(),
  "src",
  "app",
  "admin",
  "settings"
);

export async function loadAdminSettingsDefinitions(
  dirPath = defaultAdminSettingsDefinitionsDir
): Promise<AdminSettingsDefinition[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });

  const yamlFiles = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const definitions: AdminSettingsDefinition[] = [];
  const seenGroupKeys = new Set<string>();

  for (const fileName of yamlFiles) {
    const absolutePath = path.join(dirPath, fileName);
    const rawYaml = await readFile(absolutePath, "utf-8");
    const definition = parseAdminSettingsDefinitionYaml(rawYaml, fileName);
    const groupKey = `${definition.type}::${definition.name}`;

    if (seenGroupKeys.has(groupKey)) {
      throw new Error(`Duplicate settings group key \"${groupKey}\" defined in ${fileName}`);
    }

    seenGroupKeys.add(groupKey);
    definitions.push(definition);
  }

  if (definitions.length === 0) {
    throw new Error(`No YAML settings definitions found in ${dirPath}`);
  }

  return definitions;
}
