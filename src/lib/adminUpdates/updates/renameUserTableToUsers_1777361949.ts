import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error } = await supabaseAdmin.rpc("rename_user_table_to_users");

  if (error) {
    throw new Error(`Failed to rename User table to Users: ${error.message}`);
  }

  return {
    message: 'Renamed database table "User" to "Users".',
  };
}
