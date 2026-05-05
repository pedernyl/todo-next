import { supabaseAdmin } from "../../supabaseAdminClient";

type AdminError = { code?: string; message?: string } | null;

function isMissingRelationError(error: AdminError): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;

  const message = (error.message ?? "").toLowerCase();
  return message.includes("does not exist") && message.includes("todo");
}

export async function runAdminUpdate() {
  const tableNames = ["Todos", "todos"];
  let inspectedTableCount = 0;
  let updatedRows = 0;

  for (const tableName of tableNames) {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .update({ sort_index: null })
      .lt("sort_index", 0)
      .select("id");

    if (error) {
      if (isMissingRelationError(error)) {
        continue;
      }
      throw new Error(`Failed to normalize ${tableName}.sort_index values: ${error.message}`);
    }

    inspectedTableCount += 1;
    updatedRows += (data ?? []).length;
  }

  if (inspectedTableCount === 0) {
    throw new Error("Could not find a todos table to normalize (checked Todos and todos).");
  }

  return {
    message: `Normalized ${updatedRows} todo rows with negative sort_index to null.`,
  };
}
