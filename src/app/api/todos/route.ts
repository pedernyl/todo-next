// Handle fetching todos with optional completed filter
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const showCompleted = url.searchParams.get('showCompleted');
  const category_id = url.searchParams.get('category_id');
  const limitParam = url.searchParams.get('limit');
  // Default to true if not provided
  const showCompletedBool = showCompleted === null ? true : showCompleted === 'true';
  // Resolve the admin-controlled load policy and compute the effective limit.
  // If a valid `limit` query param is provided, it is clamped to [1, maxLoadLimit].
  // Otherwise, defaultLoadLimit is used.
  const policy = await getTodoLoadPolicy();
  const requestedLimit = limitParam !== null ? parseInt(limitParam, 10) : null;
  const effectiveLimit = computeEffectiveLimit(policy, requestedLimit);
  // Import getTodos dynamically to avoid circular imports
  const { getTodos } = await import('../../../lib/dataService');
  const todos = await getTodos(showCompletedBool, category_id, effectiveLimit);
  return NextResponse.json(todos);
}
import { NextRequest, NextResponse } from 'next/server';
import { createTodo, updateTodo } from '../../../lib/dataService';
import { getTodoLoadPolicy, computeEffectiveLimit } from '../../../lib/todoLoadPolicy';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";

// Handle creating a Todo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { title, description, parent_todo, category_id } = await req.json();

  const todo = await createTodo(title, description, parent_todo, category_id);

  return NextResponse.json(todo);
}

// Handle updating a Todo (toggle completed)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, completed, title, description, reorder } = body;

  if (reorder) {
    const { updates, parent_todo = null, category_id, completed: completedScope } = body;
    if (!Array.isArray(updates) || typeof completedScope !== 'boolean') {
      return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
    }

    // Validate and normalize each update entry
    for (const update of updates) {
      if (!update || typeof update !== 'object') {
        return NextResponse.json({ error: "Invalid update entry: must be an object" }, { status: 400 });
      }
      if (typeof update.id === 'undefined') {
        return NextResponse.json({ error: "Invalid update entry: id is required" }, { status: 400 });
      }
      if (typeof update.sort_index !== 'number' || !Number.isFinite(update.sort_index)) {
        return NextResponse.json({ error: "Invalid update entry: sort_index must be a finite number" }, { status: 400 });
      }
      // Normalize id to number if it's a string representation
      if (typeof update.id === 'string') {
        const numId = Number(update.id);
        if (!Number.isFinite(numId)) {
          return NextResponse.json({ error: "Invalid update entry: id must be a valid number" }, { status: 400 });
        }
        update.id = numId;
      } else if (typeof update.id !== 'number' || !Number.isFinite(update.id)) {
        return NextResponse.json({ error: "Invalid update entry: id must be a number" }, { status: 400 });
      }
    }

    const email = session.user?.email;
    if (!email) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }

    const { fetchUserIdByEmail, reorderTodoSiblings } = await import('../../../lib/dataService');

    try {
      const userId = await fetchUserIdByEmail(email);
      const reorderedTodos = await reorderTodoSiblings(
        userId,
        updates,
        {
          parent_todo,
          completed: completedScope,
          ...(typeof category_id !== 'undefined' ? { category_id } : {}),
        }
      );
      return NextResponse.json({ updated: reorderedTodos });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reorder todos";
      return NextResponse.json({ error: message }, { status: 500 });
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
    return NextResponse.json({ error: "Invalid PATCH payload" }, { status: 400 });
  }

  return NextResponse.json(todo);
}

// Handle soft deleting a Todo
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, deleted_by } = await req.json();
  // Always require deleted_by to be a user id (number)
  const userId = deleted_by;
  if (!userId || typeof userId !== 'number') {
    return NextResponse.json({ error: "User id (number) required for deleted_by" }, { status: 400 });
  }
  const { softDeleteTodo } = await import('../../../lib/dataService');
  const deleted = await softDeleteTodo(id, userId);
  return NextResponse.json(deleted);
}