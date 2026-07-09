import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc(
    "add_category_soft_delete_columns_if_missing"
  );

  if (error) {
    throw new Error
      (`Failed to run add_category_soft_delete_columns_if_missing: ${error.message}`);
  }

  return {
    message: 'Category soft-delete columns ensured.',
  };
}