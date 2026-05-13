import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc("alter_sort_index_to_integer");

  if (error) {
    throw new Error(`Failed to alter sort_index column to integer: ${error.message}`);
  }

  return {
    message: "Altered sort_index column to integer to support larger gap values (now supports ~32,000 todos per user).",
  };
}
