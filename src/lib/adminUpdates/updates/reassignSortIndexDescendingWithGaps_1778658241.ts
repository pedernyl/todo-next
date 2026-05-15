import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc("reassign_sort_index_descending_with_gaps");

  if (error) {
    throw new Error(`Failed to reassign sort_index values: ${error.message}`);
  }

  return {
    message: "Reassigned sort_index for all todos to descending order with gaps of 1000.",
  };
}
