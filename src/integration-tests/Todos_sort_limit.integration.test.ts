import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { cleanupTestOwnerData, createTestUser } from "./integrationTestHelpers";
import { createTodo, getTodos, reorderTodoSiblings } from "../lib/dataService";

const TEST_OWNER_EMAIL = "sort-limit-integration-test@example.com";
const TEST_OWNER_ID = 999001;

vi.mock('../lib/appServerSession', () => ({ 
  getAppServerSession: vi.fn(async () => ({
    user: { email: TEST_OWNER_EMAIL },
  })),
}));

type InsertedTodoRow = {
  id: number;
  title: string;
  sort_index?: number | null;
  parent_todo?: number | null;
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

createSupabaseAdminForIntegrationTests.client = null as SupabaseClient | null;

describe("Todos_sort_limit", () => {
  let insertedTodo: InsertedTodoRow | null = null;
  let insertedChildren: InsertedTodoRow[] = [];
  let orderedChildrenAfterSort: InsertedTodoRow[] = [];
  let limitedTodosFromFetch: InsertedTodoRow[] = [];
  let offsetTodosFromFetch: InsertedTodoRow[] = [];

  beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    }

    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    // Clean up any leftover test data before starting
    await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);

    await createTestUser(supabaseAdmin, TEST_OWNER_ID, TEST_OWNER_EMAIL);

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
      {
        id: String(child1.id),
        sort_index: (child5.sort_index ?? 0) + 1000,
      },
    ];

    const reorderedChildren = await reorderTodoSiblings(
      TEST_OWNER_ID,
      sortUpdates
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

    const fetchedWithOffset = await getTodos(true, undefined, 3, 2);
    offsetTodosFromFetch = fetchedWithOffset.map((todo) => ({
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
    const supabaseAdmin = createSupabaseAdminForIntegrationTests();
    await cleanupTestOwnerData(supabaseAdmin, TEST_OWNER_ID);
  });

  it("adds one todo named Todo_sort_limit in test database", () => {
    expect(insertedTodo).toBeTruthy();
    expect(insertedTodo?.title).toBe("Todo_sort_limit");
    expect(insertedTodo?.sort_index).toBe(1000);
    expect(insertedChildren).toHaveLength(5);
    expect(insertedChildren.map((child) => child.title)).toEqual([
      "Todo_sort_limit_c1",
      "Todo_sort_limit_c2",
      "Todo_sort_limit_c3",
      "Todo_sort_limit_c4",
      "Todo_sort_limit_c5",
    ]);
    expect(orderedChildrenAfterSort).toHaveLength(1);
    expect(orderedChildrenAfterSort.map((child) => child.title)).toEqual([
      "Todo_sort_limit_c1",
    ]);
    expect(orderedChildrenAfterSort[0]?.sort_index).toBe(7000);
    expect(limitedTodosFromFetch).toHaveLength(5);
    expect(limitedTodosFromFetch.map((todo) => todo.title)).toEqual([
      "Todo_sort_limit",
      "Todo_sort_limit_c1",
      "Todo_sort_limit_c5",
      "Todo_sort_limit_c4",
      "Todo_sort_limit_c3",
    ]);

    expect(offsetTodosFromFetch).toHaveLength(3);
    expect(offsetTodosFromFetch.map((todo) => todo.title)).toEqual([
      "Todo_sort_limit_c5",
      "Todo_sort_limit_c4",
      "Todo_sort_limit_c3",
    ]);
  });
});
