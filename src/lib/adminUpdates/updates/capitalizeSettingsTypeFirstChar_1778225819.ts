import { supabaseAdmin } from "../../supabaseAdminClient";

type SettingsKeyRow = {
  id: number;
  name: string;
  type: string;
};

function capitalizeFirstCharacter(value: string): string {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export async function runAdminUpdate() {
  const { data, error } = await supabaseAdmin
    .from("Settings")
    .select("id, name, type");

  if (error) {
    throw new Error(`Failed to load Settings rows for migration: ${error.message}`);
  }

  const allRows = (data ?? []) as SettingsKeyRow[];
  const rows = allRows.filter((row) => {
    if (!row.type) return false;
    const migratedType = capitalizeFirstCharacter(row.type);
    return migratedType !== row.type;
  });

  if (rows.length === 0) {
    return {
      message: "No Settings rows found requiring type capitalization migration.",
    };
  }

  const existingKeys = new Set(allRows.map((row) => `${row.name}::${row.type}`));

  let migrated = 0;
  let deletedLegacyDuplicates = 0;

  for (const row of rows) {
    const migratedType = capitalizeFirstCharacter(row.type);
    const migratedKey = `${row.name}::${migratedType}`;

    if (existingKeys.has(migratedKey)) {
      const { error: deleteError } = await supabaseAdmin
        .from("Settings")
        .delete()
        .eq("id", row.id);

      if (deleteError) {
        throw new Error(
          `Failed deleting legacy Settings row id=${row.id} (${row.name}/${row.type}): ${deleteError.message}`
        );
      }

      deletedLegacyDuplicates += 1;
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("Settings")
      .update({ type: migratedType })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Failed migrating Settings row id=${row.id} (${row.name}/${row.type} -> ${migratedType}): ${updateError.message}`
      );
    }

    existingKeys.add(migratedKey);
    migrated += 1;
  }

  return {
    message: `Migrated ${migrated} Settings row(s) to capitalized type values. Deleted ${deletedLegacyDuplicates} legacy lowercase duplicate row(s) after confirming capitalized rows exist.`,
  };
}
