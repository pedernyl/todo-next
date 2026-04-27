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
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return value;
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
  const { data, error } = await supabase
    .from('todos')
    .update({ title, description })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

// Fetch all todos from Supabase
export async function getTodos(showCompleted: boolean = true, category_id?: string | null): Promise<Todo[]> {
  const userId = await getAuthenticatedUserId();


  let query = supabase
    .from('todos')
    .select('*')
    .eq('owner_id', userId)
    .is('deleted_timestamp', null)
    .order('completed', { ascending: true })
    .order('sort_index', { ascending: true })
    .order('id', { ascending: true });

  if (!showCompleted) {
    query = query.eq('completed', false);
  }
  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapTodosWithDescriptionHtml((data ?? []) as Todo[]);
}

// Create a new todo in Supabase
export async function createTodo(title: string, description: string, parent_todo?: string, category_id?: string): Promise<Todo> {
  const userId = await getAuthenticatedUserId();
  let maxSortIndexQuery = supabase
    .from('todos')
    .select('sort_index')
    .eq('owner_id', userId)
    .is('deleted_timestamp', null)
    .eq('completed', false)
    .not('sort_index', 'is', null);

  if (parent_todo) {
    maxSortIndexQuery = maxSortIndexQuery.eq('parent_todo', parent_todo);
  } else {
    maxSortIndexQuery = maxSortIndexQuery.is('parent_todo', null);
  }
  if (category_id) {
    maxSortIndexQuery = maxSortIndexQuery.eq('category_id', category_id);
  } else {
    maxSortIndexQuery = maxSortIndexQuery.is('category_id', null);
  }

  const { data: maxSortData, error: maxSortError } = await maxSortIndexQuery
    .order('sort_index', { ascending: false })
    .limit(1);
  if (maxSortError) throw maxSortError;
  const nextSortIndex = normalizeSortIndex(maxSortData?.[0]?.sort_index) === Number.MAX_SAFE_INTEGER
    ? 0
    : normalizeSortIndex(maxSortData?.[0]?.sort_index) + 1;

  const insertObj: Partial<Todo> = {
    title,
    description,
    owner_id: userId,
    completed: false,
    sort_index: nextSortIndex,
  };
  if (parent_todo) insertObj.parent_todo = parent_todo;
  if (category_id) insertObj.category_id = category_id;
  const { data, error } = await supabase
    .from('todos')
    .insert([insertObj])
    .select()
    .single();
  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

// Update a todo's completed state in Supabase
export async function updateTodo(id: string, completed: boolean): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapTodoWithDescriptionHtml(data as Todo);
}

// Soft delete a todo: set deleted_timestamp and deleted_by (can be user id or email)
export async function softDeleteTodo(id: string, userId: string | number): Promise<Todo> {
  const deleted_timestamp = Math.floor(Date.now() / 1000);
  const { data, error } = await supabase
    .from('todos')
    .update({ deleted_timestamp, deleted_by: String(userId) })
    .eq('id', id)
    .select()
    .single();
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
  const { data: existing, error: existingError } = await supabase
    .from('todos')
    .select('id, owner_id, parent_todo, completed, category_id, deleted_timestamp')
    .eq('owner_id', userId)
    .in('id', ids);

  if (existingError) throw existingError;
  if (!existing || existing.length !== ids.length) {
    throw new Error('Some todos are missing or unauthorized');
  }

  const parentValue = normalizeComparableId(scope.parent_todo);
  const categoryValue = normalizeComparableId(scope.category_id);
  const invalidScopeTodo = existing.find((todo) => {
    const sameParent = normalizeComparableId(todo.parent_todo) === parentValue;
    const sameCompleted = Boolean(todo.completed) === scope.completed;
    const sameCategory = typeof scope.category_id === 'undefined'
      ? true
      : normalizeComparableId(todo.category_id) === categoryValue;
    return !sameParent || !sameCompleted || !sameCategory || todo.deleted_timestamp !== null;
  });

  if (invalidScopeTodo) {
    throw new Error('Invalid reorder scope for one or more todos');
  }

  await Promise.all(
    normalizedUpdates.map(async (item) => {
      const { error } = await supabase
        .from('todos')
        .update({ sort_index: item.sort_index })
        .eq('id', item.id)
        .eq('owner_id', userId);
      if (error) throw error;
    })
  );

  const { data: updated, error: updatedError } = await supabase
    .from('todos')
    .select('*')
    .eq('owner_id', userId)
    .in('id', ids)
    .order('sort_index', { ascending: true })
    .order('id', { ascending: true });

  if (updatedError) throw updatedError;
  return mapTodosWithDescriptionHtml((updated ?? []) as Todo[]);
}