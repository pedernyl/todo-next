import { isAdminUserEmail } from "../adminUsers";
import { hasSupabaseServiceRole, supabaseAdmin } from "../supabaseAdminClient";
import { adminUpdateRegistry, type AdminUpdateModule } from "./updates/registry";

export type AdminUpdate = {
  fileName: string;
  updateKey: string;
  createdUnixTimestamp: number | null;
  hasBeenExecuted: boolean;
  beenExecutedBy: number | null;
  beenExecutedTimestamp: string | null;
};

type UpdateExecutionRow = {
  id: string;
  been_executed_by: number;
  been_executed_timestamp: string;
};

type ParsedAdminUpdateFile = {
  fileName: string;
  updateKey: string;
  createdUnixTimestamp: number | null;
};

const updatesExecutionTable = process.env.ADMIN_UPDATES_TABLE || "Updates";

function parseAdminUpdateFileName(fileName: string): ParsedAdminUpdateFile {
  const moduleNameWithoutExtension = fileName.replace(/\.(ts|js)$/, "");
  const match = /^(.*)_(\d+)$/.exec(moduleNameWithoutExtension);

  if (!match) {
    return {
      fileName,
      updateKey: moduleNameWithoutExtension,
      createdUnixTimestamp: null,
    };
  }

  const updateKey = match[1] ?? moduleNameWithoutExtension;
  const parsedTimestamp = Number.parseInt(match[2] ?? "", 10);

  return {
    fileName,
    updateKey,
    createdUnixTimestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : null,
  };
}

async function listAdminUpdateFiles(): Promise<ParsedAdminUpdateFile[]> {
  return adminUpdateRegistry.map((entry) => parseAdminUpdateFileName(entry.fileName));
}

async function getAdminUpdateByFileName(fileName: string): Promise<ParsedAdminUpdateFile | undefined> {
  const updates = await listAdminUpdateFiles();
  return updates.find((update) => update.fileName === fileName);
}

async function loadAdminUpdateRunner(fileName: string) {
  const registeredUpdate = adminUpdateRegistry.find((entry) => entry.fileName === fileName);

  if (!registeredUpdate) {
    throw new Error(`No admin update module registered for ${fileName}`);
  }

  const loadedModule = registeredUpdate.module as AdminUpdateModule;
  const runner = loadedModule.runAdminUpdate ?? loadedModule.default;

  if (typeof runner !== "function") {
    throw new Error(
      `Admin update module ${fileName} must export either \"runAdminUpdate\" or a default async function`
    );
  }

  return runner;
}

export async function listAdminUpdates(): Promise<AdminUpdate[]> {
  const registeredUpdates = await listAdminUpdateFiles();
  const files = registeredUpdates.map((update) => update.fileName);

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

  return registeredUpdates
    .map((registeredUpdate) => {
      const execution = executionById.get(registeredUpdate.fileName);

      return {
        fileName: registeredUpdate.fileName,
        updateKey: registeredUpdate.updateKey,
        createdUnixTimestamp: registeredUpdate.createdUnixTimestamp,
        hasBeenExecuted: Boolean(execution),
        beenExecutedBy: execution?.been_executed_by ?? null,
        beenExecutedTimestamp: execution?.been_executed_timestamp ?? null,
      };
    })
    .sort((a, b) => (b.createdUnixTimestamp ?? 0) - (a.createdUnixTimestamp ?? 0));
}

async function getUserIdByEmail(email: string): Promise<number> {
  const result = await supabaseAdmin.from("Users").select("id").eq("email", email).single();

  const userRow = result.data as { id?: number } | null;

  if (result.error || !userRow || typeof userRow.id !== "number") {
    throw new Error("Could not resolve actor user id for update execution");
  }

  return userRow.id;
}

function requireServiceRoleKey() {
  if (!hasSupabaseServiceRole) {
    throw new Error(
      "Admin updates require SUPABASE_SERVICE_ROLE_KEY on the server to bypass RLS for update execution and logging."
    );
  }
}

async function requireAllowedActor(actorEmail: string) {
  if (!(await isAdminUserEmail(actorEmail))) {
    throw new Error(`User ${actorEmail} is not allowed to execute admin updates`);
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

async function deleteExecutionLock(fileName: string) {
  await supabaseAdmin.from(updatesExecutionTable).delete().eq("id", fileName);
}

async function markAsExecutedForce(fileName: string, actorUserId: number) {
  const { error } = await supabaseAdmin.from(updatesExecutionTable).upsert({
    id: fileName,
    been_executed_by: actorUserId,
    been_executed_timestamp: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to write execution state to ${updatesExecutionTable}: ${error.message}`);
  }
}

export async function runAdminUpdate(updateKey: string, fileName: string) {
  const update = await getAdminUpdateByFileName(fileName);

  if (!update) {
    throw new Error(`No admin update file found for ${fileName}`);
  }

  if (update.updateKey !== updateKey) {
    throw new Error(`Update key mismatch for ${fileName}: expected ${update.updateKey}`);
  }

  const runner = await loadAdminUpdateRunner(update.fileName);
  return runner();
}

export async function runAdminUpdateOnce(
  updateKey: string,
  fileName: string,
  actorEmail: string
) {
  requireServiceRoleKey();
  await requireAllowedActor(actorEmail);

  const actorUserId = await getUserIdByEmail(actorEmail);

  // Atomically claim execution by inserting the log row first.
  // The unique constraint on `id` prevents concurrent requests from both
  // proceeding, eliminating the check-then-act race window.
  const { error: lockError } = await supabaseAdmin.from(updatesExecutionTable).insert({
    id: fileName,
    been_executed_by: actorUserId,
    been_executed_timestamp: new Date().toISOString(),
  });

  if (lockError) {
    // A unique constraint violation means the update was already claimed.
    const existing = await getExistingExecution(fileName);
    if (existing) {
      throw new Error(
        `Update already executed at ${existing.been_executed_timestamp} by user id ${existing.been_executed_by}`
      );
    }
    throw new Error(`Failed to acquire execution lock for ${fileName}: ${lockError.message}`);
  }

  // Lock acquired — run the update. Roll back the log row on failure so the
  // update can be retried after the error is resolved.
  try {
    return await runAdminUpdate(updateKey, fileName);
  } catch (err) {
    await deleteExecutionLock(fileName);
    throw err;
  }
}

export async function runAdminUpdateForce(
  updateKey: string,
  fileName: string,
  actorEmail: string
) {
  requireServiceRoleKey();
  await requireAllowedActor(actorEmail);

  const actorUserId = await getUserIdByEmail(actorEmail);
  const result = await runAdminUpdate(updateKey, fileName);
  await markAsExecutedForce(fileName, actorUserId);

  return result;
}
