import { supabaseAdmin } from "../../supabaseAdminClient";

type AdminError = { code?: string; message?: string } | null;

type TodoSortRow = {
  id: string | number;
  owner_id: number;
  parent_todo: string | number | null;
  category_id: string | null;
  completed: boolean;
  sort_index: number | null;
  deleted_timestamp: number | null;
};

function isMissingRelationError(error: AdminError): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;

  const message = (error.message ?? "").toLowerCase();
  return message.includes("does not exist") && message.includes("todo");
}

function normalizeComparableId(value: string | number | null | undefined): string | null {
  if (value === null || typeof value === "undefined") return null;
  const normalized = String(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeSortIndex(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return value;
}

function compareRowOrder(a: TodoSortRow, b: TodoSortRow): number {
  const sortDiff = normalizeSortIndex(a.sort_index) - normalizeSortIndex(b.sort_index);
  if (sortDiff !== 0) return sortDiff;

  const aNum = Number(a.id);
  const bNum = Number(b.id);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }

  return String(a.id).localeCompare(String(b.id));
}

async function fetchAllActiveTodos(tableName: string): Promise<TodoSortRow[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: TodoSortRow[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("id, owner_id, parent_todo, category_id, completed, sort_index, deleted_timestamp")
      .is("deleted_timestamp", null)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as TodoSortRow[];
    allRows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

async function reindexTable(tableName: string): Promise<number> {
  const rows = await fetchAllActiveTodos(tableName);
  if (rows.length === 0) return 0;

  const scopeMap = new Map<string, TodoSortRow[]>();
  for (const row of rows) {
    const scopeKey = [
      row.owner_id,
      row.completed ? 1 : 0,
      normalizeComparableId(row.parent_todo) ?? "__ROOT__",
      normalizeComparableId(row.category_id) ?? "__NO_CATEGORY__",
    ].join("|");

    const scopedRows = scopeMap.get(scopeKey) ?? [];
    scopedRows.push(row);
    scopeMap.set(scopeKey, scopedRows);
  }

  let updatedRows = 0;

  for (const scopedRows of scopeMap.values()) {
    const ordered = [...scopedRows].sort(compareRowOrder);

    for (let index = 0; index < ordered.length; index += 1) {
      const row = ordered[index];
      if (row.sort_index === index) {
        continue;
      }

      const { error } = await supabaseAdmin
        .from(tableName)
        .update({ sort_index: index })
        .eq("id", row.id)
        .eq("owner_id", row.owner_id);

      if (error) {
        throw error;
      }

      updatedRows += 1;
    }
  }

  return updatedRows;
}

export async function runAdminUpdate() {
  const tableNames = ["Todos", "todos"];
  let inspectedTableCount = 0;
  let updatedRows = 0;

  for (const tableName of tableNames) {
    try {
      const updatedForTable = await reindexTable(tableName);
      inspectedTableCount += 1;
      updatedRows += updatedForTable;
    } catch (error) {
      const maybeAdminError = (error ?? null) as AdminError;
      if (isMissingRelationError(maybeAdminError)) {
        continue;
      }

      if (error instanceof Error) {
        throw new Error(`Failed to reindex ${tableName}.sort_index values: ${error.message}`);
      }
      throw new Error(`Failed to reindex ${tableName}.sort_index values`);
    }
  }

  if (inspectedTableCount === 0) {
    throw new Error("Could not find a todos table to reindex (checked Todos and todos).");
  }

  return {
    message: `Reindexed sort_index to contiguous 0..n within each sibling scope for ${updatedRows} todo rows.`,
  };
}
