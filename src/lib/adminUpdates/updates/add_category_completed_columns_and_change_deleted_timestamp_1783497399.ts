import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc(
    "add_category_completed_columns_and_change_deleted_ts_if_missing"
  );

  if (error) {
    throw new Error
      (`Failed to run add_category_completed_columns_and_change_deleted_ts_if_missing: ${error.message}`);
  }

  return {
    message:
      "Category completed columns added and deleted_timestamp ensured as timestamptz.",
  };
}
