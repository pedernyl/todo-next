import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc("ensure_settings_table_and_audit_columns_if_missing");

  if (error) {
    throw new Error(`Failed to ensure Settings schema: ${error.message}`);
  }

  return {
    message:
      "Ensured Settings table and required columns (id, name, type, settings, changed_by, changed_timestamp) exist.",
  };
}
