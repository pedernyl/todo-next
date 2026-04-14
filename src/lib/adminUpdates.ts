import { readdir } from "fs/promises";
import path from "path";
import { hasSupabaseServiceRole, supabaseAdmin } from "./supabaseAdminClient";

export type AdminUpdate = {
  fileName: string;
  updateKey: string;
  createdUnixTimestamp: number | null;
  hasBeenExecuted: boolean;
  beenExecutedBy: number | null;
  beenExecutedTimestamp: string | null;
};

const updatesDir = path.join(process.cwd(), "content", "updates");
const updatesExecutionTable = process.env.ADMIN_UPDATES_TABLE || "Updates";

type UpdateExecutionRow = {
  id: string;
  been_executed_by: number;
  been_executed_timestamp: string;
};

function parseUpdateFilename(fileName: string): AdminUpdate {
  const match = /^(.*)\.(\d+)$/.exec(fileName);

  if (!match) {
    return {
      fileName,
      updateKey: fileName,
      createdUnixTimestamp: null,
      hasBeenExecuted: false,
      beenExecutedBy: null,
      beenExecutedTimestamp: null,
    };
  }

  const updateKey = match[1] ?? fileName;
  const parsedTimestamp = Number.parseInt(match[2] ?? "", 10);

  return {
    fileName,
    updateKey,
    createdUnixTimestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : null,
    hasBeenExecuted: false,
    beenExecutedBy: null,
    beenExecutedTimestamp: null,
  };
}

export async function listAdminUpdates(): Promise<AdminUpdate[]> {
  const entries = await readdir(updatesDir, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name !== "README.md");

  let executionRows: UpdateExecutionRow[] = [];
  if (files.length > 0) {
    const { data, error } = await supabaseAdmin
      .from(updatesExecutionTable)
      .select("id, been_executed_by, been_executed_timestamp")
      .in("id", files);

    if (error) {
      throw new Error(`Failed to read update execution table ${updatesExecutionTable}: ${error.message}`);
    }

    executionRows = (data ?? []) as UpdateExecutionRow[];
  }

  const executionById = new Map(executionRows.map((row) => [row.id, row]));

  return files
    .map((fileName) => {
      const parsed = parseUpdateFilename(fileName);
      const execution = executionById.get(fileName);

      return {
        ...parsed,
        hasBeenExecuted: Boolean(execution),
        beenExecutedBy: execution?.been_executed_by ?? null,
        beenExecutedTimestamp: execution?.been_executed_timestamp ?? null,
      };
    })
    .sort((a, b) => (b.createdUnixTimestamp ?? 0) - (a.createdUnixTimestamp ?? 0));
}

async function getUserIdByEmail(email: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("User")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !data || typeof data.id !== "number") {
    throw new Error("Could not resolve actor user id for update execution");
  }

  return data.id;
}

function requireServiceRoleKey() {
  if (!hasSupabaseServiceRole) {
    throw new Error(
      "Admin updates require SUPABASE_SERVICE_ROLE_KEY on the server to bypass RLS for update execution and logging."
    );
  }
}

async function getExistingExecution(fileName: string): Promise<UpdateExecutionRow | null> {
  const { data, error } = await supabaseAdmin
    .from(updatesExecutionTable)
    .select("id, been_executed_by, been_executed_timestamp")
    .eq("id", fileName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read execution state from ${updatesExecutionTable}: ${error.message}`);
  }

  return (data as UpdateExecutionRow | null) ?? null;
}

async function markAsExecuted(fileName: string, actorUserId: number) {
  const { error } = await supabaseAdmin.from(updatesExecutionTable).insert({
    id: fileName,
    been_executed_by: actorUserId,
    been_executed_timestamp: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to write execution state to ${updatesExecutionTable}: ${error.message}`);
  }
}

async function runSetTodoSortIndexToMinusOne() {
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

export async function runAdminUpdate(updateKey: string) {
  if (updateKey === "set_todo_sort_index_to_minus_one") {
    return runSetTodoSortIndexToMinusOne();
  }

  throw new Error(`No app executor registered for update: ${updateKey}`);
}

export async function runAdminUpdateOnce(
  updateKey: string,
  fileName: string,
  actorEmail: string
) {
  requireServiceRoleKey();

  const existing = await getExistingExecution(fileName);
  if (existing) {
    throw new Error(
      `Update already executed at ${existing.been_executed_timestamp} by user id ${existing.been_executed_by}`
    );
  }

  const actorUserId = await getUserIdByEmail(actorEmail);
  const result = await runAdminUpdate(updateKey);
  await markAsExecuted(fileName, actorUserId);

  return result;
}
