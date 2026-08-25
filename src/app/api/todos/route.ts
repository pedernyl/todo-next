import { fetchUserIdByEmail } from '@/lib/userService';
import { NextRequest, NextResponse } from 'next/server';
import { createTodo, updateTodo } from '@/lib/dataService';
import { getTodoLoadPolicy, computeEffectiveLimit } from '@/lib/todoLoadPolicy';
import { getAppServerSession } from '@/lib/appServerSession';
import { API_MESSAGES } from '@/constants/api/apiMessages';
// Handle fetching todos with optional completed filter
export async function GET(req: NextRequest) {
  const session = await getAppServerSession();
  if (!session) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.UNAUTHORIZED }, { status: 401 });
  }
  const url = new URL(req.url);
  const showCompleted = url.searchParams.get('showCompleted');
  const category_id = url.searchParams.get('category_id');
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');
  // Default to true if not provided
  const showCompletedBool = showCompleted === null ? true : showCompleted === 'true';
  // Resolve the admin-controlled load policy and compute the effective limit.
  // If a valid `limit` query param is provided, it is clamped to [1, maxLoadLimit].
  // Otherwise, defaultLoadLimit is used.
  const policy = await getTodoLoadPolicy();
  const requestedLimit = limitParam !== null ? parseInt(limitParam, 10) : null;
  const effectiveLimit = computeEffectiveLimit(policy, requestedLimit);
  const requestedOffset = offsetParam !== null ? parseInt(offsetParam, 10) : 0;
  const effectiveOffset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
  // Import getTodos dynamically to avoid circular imports
  const { getTodos } = await import('@/lib/dataService');
  const todos = await getTodos(showCompletedBool, category_id, effectiveLimit, effectiveOffset);
  return NextResponse.json({ todos, limit: effectiveLimit });
}

// Handle creating a Todo
export async function POST(req: NextRequest) {
  const session = await getAppServerSession();
  if (!session) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.UNAUTHORIZED }, { status: 401 });
  }
  const { title, description, parent_todo, category_id } = await req.json();

  const todo = await createTodo(title, description, parent_todo, category_id);

  return NextResponse.json(todo);
}

// Handle updating a Todo (toggle completed)
export async function PATCH(req: NextRequest) {
  const session = await getAppServerSession();
  if (!session) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.UNAUTHORIZED }, { status: 401 });
  }
  const body = await req.json();
  const { id, completed, title, description, reorder } = body;

  if (reorder) {
    const { updates } = body;
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_REORDER_PAYLOAD }, { status: 400 });
    }

    // Validate and normalize each update entry
    for (const update of updates) {
      if (!update || typeof update !== 'object') {
        return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_UPDATE_ENTRY_OBJECT }, { status: 400 });
      }
      if (typeof update.id === 'undefined') {
        return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_UPDATE_ENTRY_ID_REQUIRED }, { status: 400 });
      }
      if (typeof update.sort_index !== 'number' || !Number.isFinite(update.sort_index)) {
        return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_UPDATE_ENTRY_SORT_INDEX }, { status: 400 });
      }
      // Normalize id to number if it's a string representation
      if (typeof update.id === 'string') {
        const numId = Number(update.id);
        if (!Number.isFinite(numId)) {
          return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_UPDATE_ENTRY_ID_VALID_NUMBER }, { status: 400 });
        }
        update.id = numId;
      } else if (typeof update.id !== 'number' || !Number.isFinite(update.id)) {
        return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_UPDATE_ENTRY_ID_NUMBER }, { status: 400 });
      }
    }

    const email = session.user?.email;
    if (!email) {
      return NextResponse.json({ error: API_MESSAGES.TODOS.USER_EMAIL_MISSING }, { status: 400 });
    }

    const { reorderTodoSiblings } = await import('@/lib/dataService');

    try {
      const userId = session.user?.id ?? await fetchUserIdByEmail(email);
      if (!userId || typeof userId !== 'number') {
        return NextResponse.json({ error: API_MESSAGES.TODOS.USER_ID_MISSING }, { status: 400 });
      }
      const reorderedTodos = await reorderTodoSiblings(userId, updates);
      return NextResponse.json({ updated: reorderedTodos });
    } catch {
      return NextResponse.json({ error: API_MESSAGES.TODOS.REORDER_FAILED }, { status: 500 });
    }
  }

  let todo;
  if (typeof completed !== 'undefined' && typeof title === 'undefined' && typeof description === 'undefined') {
    // Only completed status is being updated
    todo = await updateTodo(id, completed);
  } else if (typeof title !== 'undefined' || typeof description !== 'undefined') {
    // Title/description update
    const { updateTodoDetails } = await import('../../../lib/dataService');
    todo = await updateTodoDetails(id, title, description);
  } else {
    return NextResponse.json({ error: API_MESSAGES.TODOS.INVALID_PATCH_PAYLOAD }, { status: 400 });
  }

  return NextResponse.json(todo);
}

// Handle soft deleting a Todo
export async function DELETE(req: NextRequest) {
  const session = await getAppServerSession();
  if (!session) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.UNAUTHORIZED }, { status: 401 });
  }
  const { id, deleted_by } = await req.json();
  // Always require deleted_by to be a user id (number)
  const userId = deleted_by;
  if (!userId || typeof userId !== 'number') {
    return NextResponse.json({ error: API_MESSAGES.TODOS.DELETED_BY_REQUIRED }, { status: 400 });
  }
  const { softDeleteTodo } = await import('../../../lib/dataService');
  const deleted = await softDeleteTodo(id, userId);
  return NextResponse.json(deleted);
}