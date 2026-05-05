import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { assertIntegrationTestDbEnvIsActive } from "./assertIntegrationTestDbEnv";
import { createTodo, getTodos } from "../lib/dataService";
import { createCategory } from "../lib/categoryService";

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
  category_id?: string | null;
};

type MockUserIdResponse = {
  ok: boolean;
  json: () => Promise<{ userId: number }>;
};

function createSupabaseAdminForIntegrationTests() {
  if (!createSupabaseAdminForIntegrationTests.client) {
    createSupabaseAdminForIntegrationTests.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_TEST_URL as string,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY as string,
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

// ---------------------------------------------------------------------------
// Test 1: New top-level todo (no parent, no category) sorts at the top
// ---------------------------------------------------------------------------
describe("New top-level todo sorts at the top", () => {
  let insertedTodo: InsertedTodoRow | null = null;
  let fetchedTodos: InsertedTodoRow[] = [];
  let insertedTableName: "Todos" | "todos" | null = null;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    }

    global.fetch = vi.fn(async (input: unknown, init?: RequestInit): Promise<Response | MockUserIdResponse> => {
      if (String(input).includes("/api/userid")) {
        return { ok: true, json: async () => ({ userId: TEST_OWNER_ID }) };
      }
      if (!originalFetch) throw new Error(`No original fetch available for: ${String(input)}`);
      return originalFetch(input as RequestInfo | URL, init);
    }) as unknown as typeof global.fetch;

    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    const created = await createTodo("NewSort_toplevel", "");
    insertedTodo = {
      id: Number(created.id),
      title: created.title,
      sort_index: created.sort_index,
      parent_todo: created.parent_todo === null ? null : Number(created.parent_todo),
    };

    const detectTableName = async (id: number): Promise<"Todos" | "todos"> => {
      const fromTodos = await supabaseAdmin.from("Todos").select("id").eq("id", id).maybeSingle();
      if (!fromTodos.error && fromTodos.data) return "Todos";
      const fromLower = await supabaseAdmin.from("todos").select("id").eq("id", id).maybeSingle();
      if (!fromLower.error && fromLower.data) return "todos";
      throw new Error("Failed to detect todos table name for cleanup");
    };

    insertedTableName = await detectTableName(insertedTodo.id);

    const fetched = await getTodos(true);
    fetchedTodos = fetched.map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      sort_index: todo.sort_index,
      parent_todo: todo.parent_todo === null ? null : Number(todo.parent_todo),
      category_id: todo.category_id ?? null,
    }));
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (!insertedTodo || !insertedTableName) return;
    const supabaseAdmin = createSupabaseAdminForIntegrationTests();
    await supabaseAdmin.from(insertedTableName).delete().eq("id", insertedTodo.id);
  });

  it("creates a top-level todo with sort_index 0", () => {
    expect(insertedTodo).toBeTruthy();
    expect(insertedTodo?.title).toBe("NewSort_toplevel");
    expect(insertedTodo?.parent_todo).toBeNull();
    expect(insertedTodo?.sort_index).toBe(0);
  });

  it("new top-level todo appears first in the fetched list", () => {
    const topLevelTodos = fetchedTodos.filter(
      (todo) => todo.parent_todo === null && todo.category_id === null
    );
    expect(topLevelTodos.length).toBeGreaterThan(0);
    expect(topLevelTodos[0].id).toBe(insertedTodo?.id);
  });
});

// ---------------------------------------------------------------------------
// Test 2: New subtodo sorts at the top of the parent's subtodo list
// ---------------------------------------------------------------------------
describe("New subtodo sorts at the top of the parent subtodo list", () => {
  let parentTodo: InsertedTodoRow | null = null;
  let existingSubtodos: InsertedTodoRow[] = [];
  let newSubtodo: InsertedTodoRow | null = null;
  let fetchedSubtodos: InsertedTodoRow[] = [];
  let insertedTableName: "Todos" | "todos" | null = null;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    }

    global.fetch = vi.fn(async (input: unknown, init?: RequestInit): Promise<Response | MockUserIdResponse> => {
      if (String(input).includes("/api/userid")) {
        return { ok: true, json: async () => ({ userId: TEST_OWNER_ID }) };
      }
      if (!originalFetch) throw new Error(`No original fetch available for: ${String(input)}`);
      return originalFetch(input as RequestInfo | URL, init);
    }) as unknown as typeof global.fetch;

    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    const created = await createTodo("NewSort_parent", "");
    parentTodo = {
      id: Number(created.id),
      title: created.title,
      sort_index: created.sort_index,
      parent_todo: null,
    };

    const subtodoResults = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createTodo(`NewSort_sub${i + 1}`, "", String(parentTodo!.id))
      )
    );
    existingSubtodos = subtodoResults.map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      sort_index: todo.sort_index,
      parent_todo: Number(todo.parent_todo),
    }));

    const createdNew = await createTodo("NewSort_new_sub", "", String(parentTodo.id));
    newSubtodo = {
      id: Number(createdNew.id),
      title: createdNew.title,
      sort_index: createdNew.sort_index,
      parent_todo: Number(createdNew.parent_todo),
    };

    const detectTableName = async (id: number): Promise<"Todos" | "todos"> => {
      const fromTodos = await supabaseAdmin.from("Todos").select("id").eq("id", id).maybeSingle();
      if (!fromTodos.error && fromTodos.data) return "Todos";
      const fromLower = await supabaseAdmin.from("todos").select("id").eq("id", id).maybeSingle();
      if (!fromLower.error && fromLower.data) return "todos";
      throw new Error("Failed to detect todos table name for cleanup");
    };

    insertedTableName = await detectTableName(parentTodo.id);

    const fetched = await getTodos(true);
    fetchedSubtodos = fetched
      .filter((todo) => Number(todo.parent_todo) === parentTodo!.id)
      .map((todo) => ({
        id: Number(todo.id),
        title: todo.title,
        sort_index: todo.sort_index,
        parent_todo: Number(todo.parent_todo),
      }));
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (!parentTodo || !insertedTableName) return;
    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    const allIds = [
      ...existingSubtodos.map((s) => s.id),
      ...(newSubtodo ? [newSubtodo.id] : []),
    ];
    if (allIds.length > 0) {
      await supabaseAdmin.from(insertedTableName).delete().in("id", allIds);
    }
    await supabaseAdmin.from(insertedTableName).delete().eq("id", parentTodo.id);
  });

  it("creates a parent todo and five subtodos", () => {
    expect(parentTodo).toBeTruthy();
    expect(existingSubtodos).toHaveLength(5);
    expect(existingSubtodos.map((s) => s.title)).toEqual([
      "NewSort_sub1",
      "NewSort_sub2",
      "NewSort_sub3",
      "NewSort_sub4",
      "NewSort_sub5",
    ]);
  });

  it("new subtodo appears first in the parent's subtodo list", () => {
    expect(newSubtodo).toBeTruthy();
    expect(fetchedSubtodos.length).toBeGreaterThan(0);
    expect(fetchedSubtodos[0].id).toBe(newSubtodo?.id);
  });
});

// ---------------------------------------------------------------------------
// Test 3: New todo in category sorts at the top; new subtodo sorts at the top
// ---------------------------------------------------------------------------
describe("New todo in category and new subtodo each sort at the top", () => {
  let createdCategoryId: string | null = null;
  let categoryTodos: InsertedTodoRow[] = [];
  let allSubtodos: InsertedTodoRow[] = [];
  let newCategoryTodo: InsertedTodoRow | null = null;
  let chosenParent: InsertedTodoRow | null = null;
  let newSubtodo: InsertedTodoRow | null = null;
  let fetchedCategoryTodos: InsertedTodoRow[] = [];
  let fetchedChosenParentSubtodos: InsertedTodoRow[] = [];
  let insertedTableName: "Todos" | "todos" | null = null;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    assertIntegrationTestDbEnvIsActive();
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    }

    global.fetch = vi.fn(async (input: unknown, init?: RequestInit): Promise<Response | MockUserIdResponse> => {
      if (String(input).includes("/api/userid")) {
        return { ok: true, json: async () => ({ userId: TEST_OWNER_ID }) };
      }
      if (!originalFetch) throw new Error(`No original fetch available for: ${String(input)}`);
      return originalFetch(input as RequestInfo | URL, init);
    }) as unknown as typeof global.fetch;

    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    // Create test category directly via admin client (categoryService uses supabaseClient
    // which requires auth; use the service role client to insert directly)
    const { data: catData, error: catError } = await supabaseAdmin
      .from("Category")
      .insert([{ title: "NewSort_testcategory", owner_id: TEST_OWNER_ID }])
      .select()
      .single();
    if (catError) throw catError;
    createdCategoryId = catData.id;

    // Create 5 todos in the category, each with 5 subtodos
    const parentResults = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createTodo(`NewSort_cattodo${i + 1}`, "", undefined, createdCategoryId!)
      )
    );
    categoryTodos = parentResults.map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      sort_index: todo.sort_index,
      parent_todo: null,
      category_id: todo.category_id ?? null,
    }));

    const subtodoResults = await Promise.all(
      categoryTodos.flatMap((parent) =>
        Array.from({ length: 5 }, (_, i) =>
          createTodo(`NewSort_cattodo${categoryTodos.indexOf(parent) + 1}_sub${i + 1}`, "", String(parent.id))
        )
      )
    );
    allSubtodos = subtodoResults.map((todo) => ({
      id: Number(todo.id),
      title: todo.title,
      sort_index: todo.sort_index,
      parent_todo: todo.parent_todo === null ? null : Number(todo.parent_todo),
      category_id: todo.category_id ?? null,
    }));

    // Create a new top-level todo in the category — should appear first
    const createdNew = await createTodo("NewSort_new_cattodo", "", undefined, createdCategoryId!);
    newCategoryTodo = {
      id: Number(createdNew.id),
      title: createdNew.title,
      sort_index: createdNew.sort_index,
      parent_todo: null,
      category_id: createdNew.category_id ?? null,
    };

    // Pick the first of the original category todos as the parent for the new subtodo
    chosenParent = categoryTodos[0];

    // Create a new subtodo under the chosen parent — should appear first among its siblings
    const createdNewSub = await createTodo(
      "NewSort_new_cattodo_sub",
      "",
      String(chosenParent.id)
    );
    newSubtodo = {
      id: Number(createdNewSub.id),
      title: createdNewSub.title,
      sort_index: createdNewSub.sort_index,
      parent_todo: Number(createdNewSub.parent_todo),
    };

    const detectTableName = async (id: number): Promise<"Todos" | "todos"> => {
      const fromTodos = await supabaseAdmin.from("Todos").select("id").eq("id", id).maybeSingle();
      if (!fromTodos.error && fromTodos.data) return "Todos";
      const fromLower = await supabaseAdmin.from("todos").select("id").eq("id", id).maybeSingle();
      if (!fromLower.error && fromLower.data) return "todos";
      throw new Error("Failed to detect todos table name for cleanup");
    };

    insertedTableName = await detectTableName(categoryTodos[0].id);

    const fetched = await getTodos(true, createdCategoryId);
    fetchedCategoryTodos = fetched
      .filter((todo) => todo.parent_todo === null || todo.parent_todo === undefined)
      .map((todo) => ({
        id: Number(todo.id),
        title: todo.title,
        sort_index: todo.sort_index,
        parent_todo: null,
        category_id: todo.category_id ?? null,
      }));

    fetchedChosenParentSubtodos = fetched
      .filter((todo) => Number(todo.parent_todo) === chosenParent!.id)
      .map((todo) => ({
        id: Number(todo.id),
        title: todo.title,
        sort_index: todo.sort_index,
        parent_todo: Number(todo.parent_todo),
      }));
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (!insertedTableName) return;
    const supabaseAdmin = createSupabaseAdminForIntegrationTests();

    const allTodoIds = [
      ...allSubtodos.map((s) => s.id),
      ...(newSubtodo ? [newSubtodo.id] : []),
      ...categoryTodos.map((t) => t.id),
      ...(newCategoryTodo ? [newCategoryTodo.id] : []),
    ];
    if (allTodoIds.length > 0) {
      await supabaseAdmin.from(insertedTableName).delete().in("id", allTodoIds);
    }

    if (createdCategoryId) {
      await supabaseAdmin.from("Category").delete().eq("id", createdCategoryId);
    }
  });

  it("creates a category with 5 todos each having 5 subtodos", () => {
    expect(createdCategoryId).toBeTruthy();
    expect(categoryTodos).toHaveLength(5);
    expect(allSubtodos).toHaveLength(25);
  });

  it("new todo in category appears first in the category list", () => {
    expect(newCategoryTodo).toBeTruthy();
    expect(fetchedCategoryTodos.length).toBeGreaterThan(0);
    expect(fetchedCategoryTodos[0].id).toBe(newCategoryTodo?.id);
  });

  it("new subtodo appears first in the chosen parent's subtodo list", () => {
    expect(newSubtodo).toBeTruthy();
    expect(fetchedChosenParentSubtodos.length).toBeGreaterThan(0);
    expect(fetchedChosenParentSubtodos[0].id).toBe(newSubtodo?.id);
  });
});
