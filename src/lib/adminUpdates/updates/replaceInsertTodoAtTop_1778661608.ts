import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc("replace_insert_todo_at_top");

  if (error) {
    throw new Error(`Failed to replace insert_todo_at_top function: ${error.message}`);
  }

  return {
    message:
      "Replaced insert_todo_at_top to append by owner-wide max(sort_index) + 1000 without shifting existing todos.",
  };
}