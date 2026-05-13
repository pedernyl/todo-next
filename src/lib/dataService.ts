import { supabase } from './supabaseClient';
import { Todo } from '../../types';
import { authOptions } from "../lib/authOptions";
import { getServerSession } from "next-auth";
import { renderSanitizedMarkdown } from "./markdown";

type ReorderUpdateInput = {
  id: string;
  sort_index: number;
};

type ReorderScope = {
  parent_todo: string | null;
  completed: boolean;
  category_id?: string | null;
};

type ReorderExistingTodoRow = {
  id: string | number;
  owner_id: number;
  deleted_timestamp: number | null;
};

const TODOS_TABLE_NAME = 'Todos';
const LEGACY_TODOS_TABLE_NAME = 'todos';

// TODO(remove-legacy-todos-fallback): Remove this fallback after all environments have the renamed table.
function shouldFallbackToLegacyTodosTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42P01') return true;
  if (error.code === 'PGRST205') {
    const schemaCacheMessage = (error.message ?? '').toLowerCase();
    return schemaCacheMessage.includes('public.todos') || schemaCacheMessage.includes('public."todos"');
  }

  const message = (error.message ?? '').toLowerCase();
  return message.includes('relation') && message.includes('todos') && message.includes('does not exist');
}

async function runTodosQueryWithFallback(
  queryFactory: (tableName: string) => PromiseLike<{ data: any; error: any }>
): Promise<{ data: any; error: any }> {
  const primaryResult = await queryFactory(TODOS_TABLE_NAME);

  if (!shouldFallbackToLegacyTodosTable(primaryResult.error)) {
    return primaryResult;
  }

  return queryFactory(LEGACY_TODOS_TABLE_NAME);
}

function normalizeComparableId(value: string | number | null | undefined): string | null {
  if (value === null || typeof value === 'undefined') return null;
  const normalized = String(value);
  return normalized.length > 0 ? normalized : null;
}

export async function fetchUserIdByEmail(email: string): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL environment variable is not set");
  }
  const userIdRes = await fetch(
    `${baseUrl}/api/userid?email=${encodeURIComponent(email)}`,
    { cache: "no-store" }
  );
  if (!userIdRes.ok) throw new Error("Could not fetch user id");
  const { userId } = await userIdRes.json();
  if (typeof userId !== 'number') throw new Error('userId must be a number');
  return userId;
}

async function getAuthenticatedUserId(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("User not authenticated");
  const email = session.user?.email;
  if (!email) throw new Error("User email missing");
  return fetchUserIdByEmail(email);
}

function normalizeSortIndex(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return value;
}

function compareTodosForDisplayOrder(a: Todo, b: Todo): number {
  const completedDiff = Number(a.completed) - Number(b.completed);
  if (completedDiff !== 0) return completedDiff;

  const sortDiff = normalizeSortIndex(b.sort_index) - normalizeSortIndex(a.sort_index);
  if (sortDiff !== 0) return sortDiff;

  const aNum = Number(a.id);
  const bNum = Number(b.id);
  if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
    return String(a.id).localeCompare(String(b.id));
  }
  return aNum - bNum;
}

export function applyHierarchicalTodoLimit(todos: Todo[], limit?: number): Todo[] {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return todos;
  }

  const safeLimit = Math.max(Math.floor(limit), 0);
  if (safeLimit === 0) {
    return [];
  }

  const todoById = new Map<string, Todo>();
  const childrenByParent = new Map<string, Todo[]>();
  const roots: Todo[] = [];
  const orphanRoots: Todo[] = [];

  for (const todo of todos) {
    todoById.set(String(todo.id), todo);
  }

  for (const todo of todos) {
    const parentId = normalizeComparableId(todo.parent_todo);
    if (!parentId) {
      roots.push(todo);
      continue;
    }

    if (!todoById.has(parentId)) {
      orphanRoots.push(todo);
      continue;
    }

    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(todo);
    childrenByParent.set(parentId, siblings);
  }

  roots.sort(compareTodosForDisplayOrder);
  orphanRoots.sort(compareTodosForDisplayOrder);
  for (const siblings of childrenByParent.values()) {
    siblings.sort(compareTodosForDisplayOrder);
  }

  const selected: Todo[] = [];
  const visited = new Set<string>();

  const visit = (todo: Todo): void => {
    if (selected.length >= safeLimit) return;

    const id = String(todo.id);
    if (visited.has(id)) return;
    visited.add(id);
    selected.push(todo);

    const children = childrenByParent.get(id) ?? [];
    for (const child of children) {
      if (selected.length >= safeLimit) break;
      visit(child);
    }
  };

  for (const root of roots) {
    if (selected.length >= safeLimit) break;
    visit(root);
  }

  for (const orphanRoot of orphanRoots) {
    if (selected.length >= safeLimit) break;
    visit(orphanRoot);
  }

  // Safety fallback for any disconnected/cyclic edge cases.
  if (selected.length < safeLimit) {
    const orderedTodos = [...todos].sort(compareTodosForDisplayOrder);
    for (const todo of orderedTodos) {
      if (selected.length >= safeLimit) break;
      if (!visited.has(String(todo.id))) {
        selected.push(todo);
        visited.add(String(todo.id));
      }
    }
  }

  return selected;
}

async function mapTodoWithDescriptionHtml(todo: Todo): Promise<Todo> {
  return {
    ...todo,
    description_html: await renderSanitizedMarkdown(todo.description ?? "", "todo"),
  };
}

async function mapTodosWithDescriptionHtml(todos: Todo[]): Promise<Todo[]> {
  return Promise.all(todos.map((todo) => mapTodoWithDescriptionHtml(todo)));
}

// Update a todo's title and description in Supabase
export async function updateTodoDetails(id: string, title: string, description: string): Promise<Todo> {
  const { data, error } = await runTodosQueryWithFallback((tableName) =>
    supabase.from(tableName).update({ title, description }).eq('id', id).select().single()
  );
  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

// Fetch all todos from Supabase
export async function getTodos(
  showCompleted: boolean = true,
  category_id?: string | null,
  limit?: number,
  offset: number = 0
): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();
  const effectiveLimit = typeof limit === 'number' && Number.isFinite(limit)
    ? Math.max(Math.floor(limit), 1)
    : 50;
  const effectiveOffset = Number.isFinite(offset) ? Math.max(Math.floor(offset), 0) : 0;
  const pageEndExclusive = effectiveOffset + effectiveLimit;

  // When hiding completed todos, include incomplete children whose completed parents
  // are filtered out by building pages from the full incomplete set.
  if (!showCompleted) {
    const { data, error } = await runTodosQueryWithFallback((tableName) => {
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('owner_id', userId)
        .is('deleted_timestamp', null)
        .eq('completed', false)
        .order('sort_index', { ascending: false })
        .order('id', { ascending: true });

      if (category_id) {
        query = query.eq('category_id', category_id);
      }

      return query;
    });

    if (error) throw error;
    const incompleteTodos = (data ?? []) as Todo[];
    const hierarchicalWindow = applyHierarchicalTodoLimit(incompleteTodos, pageEndExclusive);
    const pagedTodos = hierarchicalWindow.slice(effectiveOffset, pageEndExclusive);
    return mapTodosWithDescriptionHtml(pagedTodos);
  }

  // Keep a fixed root batch size so query cost does not grow with deep offsets.
  const ROOT_BATCH_SIZE = 100;
  const FRONTIER_CHUNK_SIZE = 200;

  const applySharedTodoFilters = (query: any) => {
    let nextQuery = query
      .eq('owner_id', userId)
      .is('deleted_timestamp', null)
      .order('completed', { ascending: true })
      .order('sort_index', { ascending: false })
      .order('id', { ascending: true });

    if (!showCompleted) {
      nextQuery = nextQuery.eq('completed', false);
    }
    if (category_id) {
      nextQuery = nextQuery.eq('category_id', category_id);
    }

    return nextQuery;
  };

  const orderedTodos: Todo[] = [];
  let rootOffset = 0;

  while (orderedTodos.length < pageEndExclusive) {
    // Fetch a batch of root todos.
    const { data: rootData, error: rootError } = await runTodosQueryWithFallback((tableName) =>
      applySharedTodoFilters(
        supabase
          .from(tableName)
          .select('*')
          .is('parent_todo', null)
      ).range(rootOffset, rootOffset + ROOT_BATCH_SIZE - 1)
    );
    if (rootError) throw rootError;
    const roots = (rootData ?? []) as Todo[];
    if (roots.length === 0) break;

    // BFS: fetch all descendants of this root batch in bulk —
    // one query per tree level instead of one query per root.
    const childrenByParent = new Map<string, Todo[]>();
    let frontier: string[] = roots.map((r) => String(r.id));

    while (frontier.length > 0) {
      const children: Todo[] = [];

      for (let chunkStart = 0; chunkStart < frontier.length; chunkStart += FRONTIER_CHUNK_SIZE) {
        const frontierChunk = frontier.slice(chunkStart, chunkStart + FRONTIER_CHUNK_SIZE);
        const { data: childData, error: childError } = await runTodosQueryWithFallback((tableName) =>
          applySharedTodoFilters(
            supabase.from(tableName).select('*').in('parent_todo', frontierChunk)
          )
        );
        if (childError) throw childError;
        children.push(...((childData ?? []) as Todo[]));
      }

      if (children.length === 0) break;

      const nextFrontier: string[] = [];
      for (const child of children) {
        const parentId = normalizeComparableId(child.parent_todo);
        if (!parentId) continue;
        const siblings = childrenByParent.get(parentId) ?? [];
        siblings.push(child);
        childrenByParent.set(parentId, siblings);
        nextFrontier.push(String(child.id));
      }
      frontier = nextFrontier;
    }

    for (const siblings of childrenByParent.values()) {
      siblings.sort(compareTodosForDisplayOrder);
    }

    // Flatten roots + their subtrees in hierarchical display order.
    const visited = new Set<string>();
    const flattenSubtree = (parentId: string): void => {
      const children = childrenByParent.get(parentId) ?? [];
      for (const child of children) {
        const id = String(child.id);
        if (visited.has(id)) continue;
        visited.add(id);
        orderedTodos.push(child);
        flattenSubtree(id);
      }
    };

    for (const root of roots) {
      const id = String(root.id);
      if (!visited.has(id)) {
        visited.add(id);
        orderedTodos.push(root);
        flattenSubtree(id);
      }
    }

    rootOffset += roots.length;
    if (roots.length < ROOT_BATCH_SIZE) break; // last batch
  }

  const pagedTodos = orderedTodos.slice(effectiveOffset, pageEndExclusive);
  return mapTodosWithDescriptionHtml(pagedTodos);
}

// Create a new todo in Supabase
export async function createTodo(title: string, description: string, parent_todo?: string, category_id?: string): Promise<Todo> {
  const userId = await getAuthenticatedUserId();

  // insert_todo_at_top shifts all valid sibling sort_index values up by 1 and
  // inserts the new todo at sort_index = 0 in a single atomic transaction.
  // This avoids the N+1 update pattern and ensures no inconsistent state is
  // visible between the shift and the insert.
  const { data, error } = await supabase.rpc('insert_todo_at_top', {
    p_title: title,
    p_description: description,
    p_owner_id: userId,
    p_parent_todo: parent_todo != null ? Number(parent_todo) : null,
    p_category_id: category_id != null ? Number(category_id) : null,
  });

  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

// Update a todo's completed state in Supabase
export async function updateTodo(id: string, completed: boolean): Promise<Todo> {
  const { data, error } = await runTodosQueryWithFallback((tableName) =>
    supabase.from(tableName).update({ completed }).eq('id', id).select().single()
  );

  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

// Soft delete a todo: set deleted_timestamp and deleted_by (can be user id or email)
export async function softDeleteTodo(id: string, userId: string | number): Promise<Todo> {
  const deleted_timestamp = Math.floor(Date.now() / 1000);
  const { data, error } = await runTodosQueryWithFallback((tableName) =>
    supabase
      .from(tableName)
      .update({ deleted_timestamp, deleted_by: String(userId) })
      .eq('id', id)
      .select()
      .single()
  );

  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

export async function reorderTodoSiblings(
  userId: number,
  updates: ReorderUpdateInput[],
  scope: ReorderScope
): Promise<Todo[]> {
  if (!updates.length) return [];

  const normalizedUpdates = updates.map((item, index) => {
    const id = String(item.id);
    const sortIndex = Number(item.sort_index);

    if (!id) {
      throw new Error(`Invalid reorder update entry at index ${index}: id is required`);
    }
    if (!Number.isFinite(sortIndex) || sortIndex < 0) {
      throw new Error(
        `Invalid reorder update entry at index ${index}: sort_index must be a finite non-negative number`
      );
    }

    return { id, sort_index: sortIndex };
  });

  const ids = normalizedUpdates.map((item) => item.id);
  const { data: existing, error: existingError } = await runTodosQueryWithFallback((tableName) =>
    supabase
      .from(tableName)
      .select('id, owner_id, deleted_timestamp')
      .eq('owner_id', userId)
      .in('id', ids)
  );

  if (existingError) throw existingError;
  const existingRows = (existing ?? []) as ReorderExistingTodoRow[];

  if (existingRows.length !== ids.length) {
    throw new Error('Some todos are missing or unauthorized');
  }

  const deletedTodo = existingRows.find((todo) => todo.deleted_timestamp !== null);
  if (deletedTodo) {
    throw new Error('Cannot reorder deleted todos');
  }

  await Promise.all(
    normalizedUpdates.map(async (item) => {
      const { error } = await runTodosQueryWithFallback((tableName) =>
        supabase
          .from(tableName)
          .update({ sort_index: item.sort_index })
          .eq('id', item.id)
          .eq('owner_id', userId)
      );

      if (error) throw error;
    })
  );

  const { data: updated, error: updatedError } = await runTodosQueryWithFallback((tableName) =>
    supabase
      .from(tableName)
      .select('*')
      .eq('owner_id', userId)
      .in('id', ids)
      .order('sort_index', { ascending: false })
      .order('id', { ascending: true })
  );

  if (updatedError) throw updatedError;
  return mapTodosWithDescriptionHtml((updated ?? []) as Todo[]);
}