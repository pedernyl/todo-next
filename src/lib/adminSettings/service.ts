import { supabaseAdmin } from "../supabaseAdminClient";
import { loadAdminSettingsDefinitions } from "./loader";
import type {
  AdminSettingFieldDefinition,
  AdminSettingsDefinition,
  AdminSettingsGroupState,
  AdminSettingsStoredRow,
  AdminSettingsTypeGroup,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueKey(name: string, type: string): string {
  return `${type}::${name}`;
}

function coerceFieldValue(field: AdminSettingFieldDefinition, value: unknown): unknown {
  if (field.type === "text" || field.type === "textarea") {
    return typeof value === "string" ? value : "";
  }

  if (field.type === "boolean") {
    return typeof value === "boolean" ? value : false;
  }

  if (field.type === "number") {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof field.default === "number"
        ? field.default
        : 0;
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    const candidate = typeof value === "string" ? value : undefined;
    if (candidate && options.some((option) => option.value === candidate)) {
      return candidate;
    }

    if (typeof field.default === "string" && options.some((option) => option.value === field.default)) {
      return field.default;
    }

    return options[0]?.value ?? "";
  }

  return value;
}

function buildDefaultValues(definition: AdminSettingsDefinition): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of definition.fields) {
    values[field.key] = coerceFieldValue(field, field.default);
  }

  return values;
}

function sanitizeSettingsValues(
  definition: AdminSettingsDefinition,
  incomingValues: unknown
): Record<string, unknown> {
  const objectValues = isPlainObject(incomingValues) ? incomingValues : {};
  const sanitized: Record<string, unknown> = {};

  for (const field of definition.fields) {
    const rawValue = objectValues[field.key];
    sanitized[field.key] = coerceFieldValue(field, rawValue);
  }

  return sanitized;
}

function composeGroupState(
  definition: AdminSettingsDefinition,
  rowByKey: Map<string, AdminSettingsStoredRow>
): AdminSettingsGroupState {
  const key = valueKey(definition.name, definition.type);
  const row = rowByKey.get(key);
  const defaults = buildDefaultValues(definition);
  const storedValues = isPlainObject(row?.settings) ? row.settings : {};

  const mergedValues: Record<string, unknown> = { ...defaults };
  for (const field of definition.fields) {
    const hasStoredValue = Object.prototype.hasOwnProperty.call(storedValues, field.key);
    const sourceValue = hasStoredValue ? storedValues[field.key] : defaults[field.key];
    mergedValues[field.key] = coerceFieldValue(field, sourceValue);
  }

  return {
    id: row?.id ?? null,
    name: definition.name,
    type: definition.type,
    title: definition.title ?? definition.name,
    description: definition.description ?? "",
    fields: definition.fields,
    values: mergedValues,
    changedBy: row?.changed_by ?? null,
    changedTimestamp: row?.changed_timestamp ?? null,
  };
}

export function groupAdminSettingsByType(groups: AdminSettingsGroupState[]): AdminSettingsTypeGroup[] {
  const grouped = new Map<string, AdminSettingsGroupState[]>();

  for (const group of groups) {
    const existing = grouped.get(group.type) ?? [];
    existing.push(group);
    grouped.set(group.type, existing);
  }

  return Array.from(grouped.entries())
    .map(([type, settings]) => ({
      type,
      settings: [...settings].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export async function loadAdminSettingsGrouped(): Promise<AdminSettingsTypeGroup[]> {
  const definitions = await loadAdminSettingsDefinitions();

  const { data, error } = await supabaseAdmin
    .from("Settings")
    .select("id, name, type, settings, changed_by, changed_timestamp");

  if (error) {
    throw new Error(`Failed to load settings from Settings table: ${error.message}`);
  }

  const rows = ((data ?? []) as AdminSettingsStoredRow[]).filter((row) => {
    return definitions.some((definition) => row.name === definition.name && row.type === definition.type);
  });

  const rowByKey = new Map(rows.map((row) => [valueKey(row.name, row.type), row]));
  const groups = definitions.map((definition) => composeGroupState(definition, rowByKey));

  return groupAdminSettingsByType(groups);
}

async function getActorUserIdByEmail(email: string): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("Users")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  const user = (data ?? null) as { id?: number } | null;
  if (error || !user || typeof user.id !== "number") {
    throw new Error(`Could not resolve actor user id for settings save: ${normalizedEmail}`);
  }

  return user.id;
}

export async function saveAdminSettingGroup(args: {
  name: string;
  type: string;
  settings: unknown;
  changedByEmail: string;
}): Promise<AdminSettingsGroupState> {
  const definitions = await loadAdminSettingsDefinitions();
  const definition = definitions.find((item) => item.name === args.name && item.type === args.type);

  if (!definition) {
    throw new Error(`Unknown settings group: ${args.type}/${args.name}`);
  }

  const actorUserId = await getActorUserIdByEmail(args.changedByEmail);
  const sanitizedSettings = sanitizeSettingsValues(definition, args.settings);
  const changedTimestamp = new Date().toISOString();

  const { data: existingRowData, error: existingRowError } = await supabaseAdmin
    .from("Settings")
    .select("id")
    .eq("name", args.name)
    .eq("type", args.type)
    .maybeSingle();

  if (existingRowError) {
    throw new Error(`Failed to load existing settings row: ${existingRowError.message}`);
  }

  const existingRow = (existingRowData ?? null) as { id?: number } | null;

  const writePayload = {
    name: args.name,
    type: args.type,
    settings: sanitizedSettings,
    changed_by: actorUserId,
    changed_timestamp: changedTimestamp,
  };

  if (typeof existingRow?.id === "number") {
    const { error: updateError } = await supabaseAdmin
      .from("Settings")
      .update(writePayload)
      .eq("id", existingRow.id);

    if (updateError) {
      throw new Error(`Failed to update settings row: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from("Settings").insert(writePayload);

    if (insertError) {
      throw new Error(`Failed to insert settings row: ${insertError.message}`);
    }
  }

  const { data: persistedRowData, error: persistedRowError } = await supabaseAdmin
    .from("Settings")
    .select("id, name, type, settings, changed_by, changed_timestamp")
    .eq("name", args.name)
    .eq("type", args.type)
    .single();

  if (persistedRowError) {
    throw new Error(`Failed to reload saved settings row: ${persistedRowError.message}`);
  }

  const persistedRow = (persistedRowData ?? null) as AdminSettingsStoredRow | null;

  return {
    id: persistedRow?.id ?? existingRow?.id ?? null,
    name: definition.name,
    type: definition.type,
    title: definition.title ?? definition.name,
    description: definition.description ?? "",
    fields: definition.fields,
    values: sanitizedSettings,
    changedBy: persistedRow?.changed_by ?? actorUserId,
    changedTimestamp: persistedRow?.changed_timestamp ?? changedTimestamp,
  };
}
