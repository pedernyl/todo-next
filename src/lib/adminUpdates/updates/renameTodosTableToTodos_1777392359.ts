import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc("rename_todos_table_to_todos_pascal");

  if (error) {
    throw new Error(`Failed to rename todos table to Todos: ${error.message}`);
  }

  return {
    message: 'Renamed database table "todos" to "Todos".',
  };
}
