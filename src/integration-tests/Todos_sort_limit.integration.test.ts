import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { createTodo, getTodos, reorderTodoSiblings } from "../lib/dataService";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => ({
    user: { email: "integration-test@example.com" },
  })),
}));

type InsertedTodoRow = {
  id: number;
  title: string;
  sort_index?: number | null;
  parent_todo?: number | null;
};

type MockUserIdResponse = {
  ok: boolean;
  json: () => Promise<{ userId: number }>;
};

function createSupabaseAdminForIntegrationTests() {
  if (!createSupabaseAdminForIntegrationTests.client) {
    createSupabaseAdminForIntegrationTests.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storageKey: "integration-test-admin-auth-token",
        },
      }
    );
  }

  return createSupabaseAdminForIntegrationTests.client;
}

createSupabaseAdminForIntegrationTests.client = null as ReturnType<typeof createClient> | null;

const TEST_OWNER_ID = 999001;

describe("Todos_sort_limit", () => {
  let insertedTodo: InsertedTodoRow | null = null;
  let insertedChildren: InsertedTodoRow[] = [];
  let orderedChildrenAfterSort: InsertedTodoRow[] = [];
  let limitedTodosFromFetch: InsertedTodoRow[] = [];
  let insertedTableName: "Todos" | "todos" | null = null;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    }

    // createTodo resolves owner id via fetchUserIdByEmail -> /api/userid.
    global.fetch = vi.fn(async (input: unknown, init?: RequestInit): Promise<Response | MockUserIdResponse> => {
      if (String(input).includes("/api/userid")) {
        return {
          ok: true,
          json: async () => ({ userId: TEST_OWNER_ID }),
        };
      }

      if (!originalFetch) {
        throw new Error(`No original fetch available for request: ${String(input)}`);
      }

      return originalFetch(input as RequestInfo | URL, init);
    }) as unknown as typeof global.fetch;

    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    const parentTodo = await createTodo("Todo_sort_limit", "");
    insertedTodo = {
      id: Number(parentTodo.id),
      title: parentTodo.title,
      sort_index: parentTodo.sort_index,
      parent_todo: parentTodo.parent_todo === null ? null : Number(parentTodo.parent_todo),
    };

    const c1 = await createTodo("Todo_sort_limit_c1", "", String(parentTodo.id));
    const c2 = await createTodo("Todo_sort_limit_c2", "", String(parentTodo.id));
    const c3 = await createTodo("Todo_sort_limit_c3", "", String(parentTodo.id));
    const c4 = await createTodo("Todo_sort_limit_c4", "", String(parentTodo.id));
    const c5 = await createTodo("Todo_sort_limit_c5", "", String(parentTodo.id));

    insertedChildren = [c1, c2, c3, c4, c5].map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      sort_index: todo.sort_index,
      parent_todo: todo.parent_todo === null ? null : Number(todo.parent_todo),
    }));

    const detectTableNameFromId = async (id: number): Promise<"Todos" | "todos"> => {
      const fromTodos = await supabaseAdmin.from("Todos").select("id").eq("id", id).maybeSingle();
      if (!fromTodos.error && fromTodos.data) return "Todos";
      const fromLowercaseTodos = await supabaseAdmin.from("todos").select("id").eq("id", id).maybeSingle();
      if (!fromLowercaseTodos.error && fromLowercaseTodos.data) return "todos";
      throw new Error("Failed to detect todos table name for cleanup");
    };

    insertedTableName = await detectTableNameFromId(Number(parentTodo.id));

    const childByTitle = new Map(insertedChildren.map((child) => [child.title, child]));
    const child1 = childByTitle.get("Todo_sort_limit_c1");
    const child2 = childByTitle.get("Todo_sort_limit_c2");
    const child3 = childByTitle.get("Todo_sort_limit_c3");
    const child4 = childByTitle.get("Todo_sort_limit_c4");
    const child5 = childByTitle.get("Todo_sort_limit_c5");

    if (!child1 || !child2 || !child3 || !child4 || !child5 || !insertedTodo) {
      throw new Error("Failed to find all inserted child todos for sorting");
    }

    const sortUpdates = [
      { id: String(child5.id), sort_index: 0 },
      { id: String(child1.id), sort_index: 1 },
      { id: String(child2.id), sort_index: 2 },
      { id: String(child3.id), sort_index: 3 },
      { id: String(child4.id), sort_index: 4 },
    ];

    const reorderedChildren = await reorderTodoSiblings(
      TEST_OWNER_ID,
      sortUpdates,
      {
        parent_todo: String(insertedTodo.id),
        completed: false,
      }
    );

    orderedChildrenAfterSort = reorderedChildren.map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      parent_todo:
        typeof todo.parent_todo === "number"
          ? todo.parent_todo
          : todo.parent_todo === null
            ? null
            : Number(todo.parent_todo),
      sort_index: todo.sort_index,
    }));

    const fetchedWithLimit = await getTodos(true, undefined, 5);
    console.log("Fetched with limit:", fetchedWithLimit);
    limitedTodosFromFetch = fetchedWithLimit.map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      parent_todo:
        typeof todo.parent_todo === "number"
          ? todo.parent_todo
          : todo.parent_todo === null
            ? null
            : Number(todo.parent_todo),
      sort_index: todo.sort_index,
    }));
  });

  afterAll(async () => {
    global.fetch = originalFetch;
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
    expect(insertedTodo?.sort_index).toBe(0);
    expect(insertedChildren).toHaveLength(5);
    expect(insertedChildren.map((child) => child.title)).toEqual([
      "Todo_sort_limit_c1",
      "Todo_sort_limit_c2",
      "Todo_sort_limit_c3",
      "Todo_sort_limit_c4",
      "Todo_sort_limit_c5",
    ]);
    expect(orderedChildrenAfterSort).toHaveLength(5);
    expect(orderedChildrenAfterSort.map((child) => child.title)).toEqual([
      "Todo_sort_limit_c5",
      "Todo_sort_limit_c1",
      "Todo_sort_limit_c2",
      "Todo_sort_limit_c3",
      "Todo_sort_limit_c4",
    ]);
    expect(limitedTodosFromFetch).toHaveLength(5);
    expect(limitedTodosFromFetch.map((todo) => todo.title)).toEqual([
      "Todo_sort_limit",
      "Todo_sort_limit_c5",
      "Todo_sort_limit_c1",
      "Todo_sort_limit_c2",
      "Todo_sort_limit_c3",
    ]);
  });
});
