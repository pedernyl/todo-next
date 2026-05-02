import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";

type InsertedTodoRow = {
  id: number;
  title: string;
  parent_todo?: number | null;
};

function createSupabaseAdminForIntegrationTests() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

describe("Todos_sort_limit", () => {
  let insertedTodo: InsertedTodoRow | null = null;
  let insertedChildren: InsertedTodoRow[] = [];
  let insertedTableName: "Todos" | "todos" | null = null;

  beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    const insertIntoTodos = async (tableName: "Todos" | "todos") => {
      return supabaseAdmin
        .from(tableName)
        .insert({ title: "Todo_sort_limit" })
        .select("id, title")
        .single<InsertedTodoRow>();
    };

    let result = await insertIntoTodos("Todos");
    insertedTableName = "Todos";

    // Keep compatibility while environments are migrating table casing.
    if (result.error?.code === "42P01" || result.error?.code === "PGRST205") {
      result = await insertIntoTodos("todos");
      insertedTableName = "todos";
    }

    if (result.error) {
      throw new Error(`Failed to insert Todo_sort_limit: ${result.error.message}`);
    }

    if (!result.data) {
      throw new Error("Failed to insert Todo_sort_limit: no row returned");
    }

    const parentTodo = result.data;
    insertedTodo = parentTodo;

    const insertChildrenIntoTodos = async (tableName: "Todos" | "todos") => {
      return supabaseAdmin
        .from(tableName)
        .insert([
          { title: "Todo_sort_limit_c1", parent_todo: parentTodo.id },
          { title: "Todo_sort_limit_c2", parent_todo: parentTodo.id },
          { title: "Todo_sort_limit_c3", parent_todo: parentTodo.id },
          { title: "Todo_sort_limit_c4", parent_todo: parentTodo.id },
          { title: "Todo_sort_limit_c5", parent_todo: parentTodo.id },
        ])
        .select("id, title, parent_todo");
    };

    let childrenResult = await insertChildrenIntoTodos(insertedTableName);
    if (childrenResult.error?.code === "42P01" || childrenResult.error?.code === "PGRST205") {
      const fallbackTableName = insertedTableName === "Todos" ? "todos" : "Todos";
      childrenResult = await insertChildrenIntoTodos(fallbackTableName);
      insertedTableName = fallbackTableName;
    }

    if (childrenResult.error) {
      throw new Error(`Failed to insert child todos for Todo_sort_limit: ${childrenResult.error.message}`);
    }

    insertedChildren = (childrenResult.data ?? []) as InsertedTodoRow[];
  });

  afterAll(async () => {
    if (!insertedTodo || !insertedTableName) return;

    const supabaseAdmin = createSupabaseAdminForIntegrationTests();
    if (insertedChildren.length > 0) {
      const childIds = insertedChildren.map((child) => child.id);
      const { error: childDeleteError } = await supabaseAdmin
        .from(insertedTableName)
        .delete()
        .in("id", childIds);

      if (childDeleteError) {
        throw new Error(`Failed to remove Todo_sort_limit children: ${childDeleteError.message}`);
      }
    }

    const { error: parentDeleteError } = await supabaseAdmin
      .from(insertedTableName)
      .delete()
      .eq("id", insertedTodo.id);

    if (parentDeleteError) {
      throw new Error(`Failed to remove Todo_sort_limit: ${parentDeleteError.message}`);
    }
  });

  it("adds one todo named Todo_sort_limit in test database", () => {
    expect(insertedTodo).toBeTruthy();
    expect(insertedTodo?.title).toBe("Todo_sort_limit");
    expect(insertedChildren).toHaveLength(5);
    expect(insertedChildren.map((child) => child.title)).toEqual([
      "Todo_sort_limit_c1",
      "Todo_sort_limit_c2",
      "Todo_sort_limit_c3",
      "Todo_sort_limit_c4",
      "Todo_sort_limit_c5",
    ]);
  });
});
