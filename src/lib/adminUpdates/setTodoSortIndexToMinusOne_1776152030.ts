import { supabaseAdmin } from "../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin
    .from("todos")
    .update({ sort_index: -1 })
    .not("id", "is", null);

  if (error) {
    throw new Error(`Failed to set sort_index to -1: ${error.message}`);
  }

  return {
    message: "Updated todos.sort_index to -1 for all rows.",
  };
}
