"use client";
import React from "react";
import { useUserId } from "../context/UserIdContext";
import { Todo } from "../../types";
import AddTodo from "./AddTodo";


import type { Category } from "../lib/categoryService";

interface TodoListProps {
  initialTodos: Todo[];
  selectedCategory?: Category | null;
}

interface TodoTreeNode extends Todo {
  children: TodoTreeNode[];
}

type ReorderComputation = {
  nextTodos: Todo[];
  updates: Array<{ id: string; sort_index: number }>;
  scope: {
    parent_todo: string | null;
    completed: boolean;
    category_id?: string | null;
  };
};

type DropPosition = "before" | "after";

type DragOverState = {
  targetId: string;
  position: DropPosition;
};

function getDropPosition(event: React.DragEvent<HTMLElement>): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function getNormalizedSortIndex(todo: Todo): number {
  if (typeof todo.sort_index !== "number" || Number.isNaN(todo.sort_index) || todo.sort_index < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return todo.sort_index;
}

function compareTodoOrder(a: Todo, b: Todo): number {
  const completedDiff = Number(a.completed) - Number(b.completed);
  if (completedDiff !== 0) return completedDiff;

  const sortDiff = getNormalizedSortIndex(a) - getNormalizedSortIndex(b);
  if (sortDiff !== 0) return sortDiff;

  const aNum = Number(a.id);
  const bNum = Number(b.id);
  if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
    return b.id.localeCompare(a.id);
  }
  return bNum - aNum;
}

// Build tree structure from flat todo array
function buildTodoTree(todos: Todo[]): TodoTreeNode[] {
  const todoMap: { [id: string]: TodoTreeNode } = {};
  const roots: TodoTreeNode[] = [];
  todos.forEach((todo) => {
    todoMap[todo.id] = { ...todo, children: [] };
  });
  todos.forEach((todo) => {
    if (todo.parent_todo) {
      if (todoMap[todo.parent_todo]) {
        todoMap[todo.parent_todo].children.push(todoMap[todo.id]);
      }
    } else {
      roots.push(todoMap[todo.id]);
    }
  });
  // Sort each level
  function sortTree(nodes: TodoTreeNode[]) {
    nodes.sort(compareTodoOrder);
    nodes.forEach((n) => n.children && sortTree(n.children));
  }
  sortTree(roots);
  return roots;
}

function computeSiblingReorder(
  todos: Todo[],
  movedId: string,
  targetId: string,
  dropPosition: DropPosition,
  visibleTodoIds: Set<string>,
  categoryId?: string | null
): ReorderComputation | null {
  if (movedId === targetId) return null;

  const movedTodo = todos.find((todo) => todo.id === movedId);
  const targetTodo = todos.find((todo) => todo.id === targetId);

  if (!movedTodo || !targetTodo) return null;
  if (!visibleTodoIds.has(movedTodo.id) || !visibleTodoIds.has(targetTodo.id)) return null;

  const movedParent = movedTodo.parent_todo ?? null;
  const targetParent = targetTodo.parent_todo ?? null;
  if (movedParent !== targetParent) return null;
  if (Boolean(movedTodo.completed) !== Boolean(targetTodo.completed)) return null;

  const siblings = todos
    .filter((todo) => {
      if (!visibleTodoIds.has(todo.id)) return false;
      if ((todo.parent_todo ?? null) !== movedParent) return false;
      return Boolean(todo.completed) === Boolean(movedTodo.completed);
    })
    .sort(compareTodoOrder);

  const fromIndex = siblings.findIndex((todo) => todo.id === movedId);
  const targetIndex = siblings.findIndex((todo) => todo.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return null;

  let insertionIndex = targetIndex + (dropPosition === "after" ? 1 : 0);
  if (fromIndex < insertionIndex) {
    insertionIndex -= 1;
  }
  if (fromIndex === insertionIndex) return null;

  const reorderedSiblings = [...siblings];
  const [movedItem] = reorderedSiblings.splice(fromIndex, 1);
  reorderedSiblings.splice(insertionIndex, 0, movedItem);

  const updates = reorderedSiblings.map((todo, index) => ({
    id: todo.id,
    sort_index: index,
  }));

  const updatesMap = new Map(updates.map((item) => [item.id, item.sort_index]));
  const nextTodos = todos.map((todo) => {
    const nextSortIndex = updatesMap.get(todo.id);
    if (typeof nextSortIndex !== "number") return todo;
    return { ...todo, sort_index: nextSortIndex };
  });

  const scope = {
    parent_todo: movedParent,
    completed: Boolean(movedTodo.completed),
    ...(typeof categoryId !== "undefined" ? { category_id: categoryId } : {}),
  };

  return { nextTodos, updates, scope };
}

// Recursive rendering with indentation
function renderTodoTree(
  tree: TodoTreeNode[],
  level: number,
  toggleDescription: (id: string) => void,
  openDescriptions: { [id: string]: boolean },
  toggleTodo: (id: string, completed: boolean) => void,
  handleCreateSubTodo: (todo: Todo) => void,
  handleEdit: (todo: Todo) => void,
  handleDelete: (todo: Todo) => void,
  userId: number | null,
  draggingTodoId: string | null,
  dragOverState: DragOverState | null,
  setDragOverState: React.Dispatch<React.SetStateAction<DragOverState | null>>,
  setDraggingTodoId: (id: string | null) => void,
  handleDropTodo: (targetId: string, position: DropPosition) => Promise<void>
) {
  return tree.map((todo: TodoTreeNode) => (
    <React.Fragment key={todo.id}>
      {dragOverState?.targetId === todo.id && draggingTodoId && draggingTodoId !== todo.id && dragOverState.position === "before" && (
        <li className={`${getIndentClass(level)} list-none`}>
          <div className="h-8 rounded-lg border-2 border-dashed border-blue-500 bg-blue-100/80 animate-pulse flex items-center px-3 text-xs font-semibold text-blue-700">
            Drop here (above)
          </div>
        </li>
      )}
      <li
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOverState({ targetId: todo.id, position: getDropPosition(event) });
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setDragOverState({ targetId: todo.id, position: getDropPosition(event) });
        }}
        onDragLeave={(event) => {
          event.stopPropagation();
          const related = event.relatedTarget as Node | null;
          if (related && event.currentTarget.contains(related)) return;
          setDragOverState((prev) => (prev?.targetId === todo.id ? null : prev));
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleDropTodo(todo.id, getDropPosition(event));
        }}
        className={`relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow hover:shadow-md transition ${getIndentClass(
          level
        )} ${draggingTodoId === todo.id ? "opacity-60 ring-2 ring-blue-300" : ""} ${
          dragOverState?.targetId === todo.id && draggingTodoId && draggingTodoId !== todo.id
            ? "bg-blue-50 ring-2 ring-blue-400"
            : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggingTodoId(todo.id);
              }}
              onDragEnd={() => {
                setDraggingTodoId(null);
                setDragOverState(null);
              }}
              className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 text-sm"
              aria-label={`Drag todo ${todo.title}`}
              title="Drag to reorder"
            >
              ::
            </button>
            <span className={todo.completed ? "line-through text-gray-400" : ""}>
              {todo.title}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleDescription(todo.id)}
              className="text-blue-600 hover:underline text-sm cursor-pointer"
            >
              {openDescriptions[todo.id] ? "Hide Description" : "Show Description"}
            </button>
          </div>
        </div>
        {openDescriptions[todo.id] && (
          <div className="mt-2 text-gray-700 text-sm border-l-4 border-blue-200 pl-4">
            {todo.description}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => toggleTodo(todo.id, !todo.completed)}
                className="px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                {todo.completed ? "Undo" : "Complete"}
              </button>
              <button
                onClick={() => handleCreateSubTodo(todo)}
                className="px-2 py-1 rounded-lg border border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm"
              >
                Create subTodo
              </button>
              <button
                className="text-blue-600 hover:underline text-xs ml-2"
                onClick={() => handleEdit(todo)}
              >
                Edit
              </button>
              {typeof userId === 'undefined' || userId === null ? (
                <span className="text-gray-400 text-xs ml-2">Loading...</span>
              ) : (
                <button
                  type="button"
                  className="text-red-600 hover:underline text-xs ml-2"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this todo?")) {
                      handleDelete(todo);
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
        {todo.children && todo.children.length > 0 && (
          <ul className="space-y-2">
            {renderTodoTree(
              todo.children,
              level + 1,
              toggleDescription,
              openDescriptions,
              toggleTodo,
              handleCreateSubTodo,
              handleEdit,
              handleDelete,
              userId,
              draggingTodoId,
              dragOverState,
              setDragOverState,
              setDraggingTodoId,
              handleDropTodo
            )}
          </ul>
        )}
      </li>
      {dragOverState?.targetId === todo.id && draggingTodoId && draggingTodoId !== todo.id && dragOverState.position === "after" && (
        <li className={`${getIndentClass(level)} list-none`}>
          <div className="h-8 rounded-lg border-2 border-dashed border-blue-500 bg-blue-100/80 animate-pulse flex items-center px-3 text-xs font-semibold text-blue-700">
            Drop here (below)
          </div>
        </li>
      )}
    </React.Fragment>
  ));
}

// Map nesting level to Tailwind margin-left classes (32px per level)
function getIndentClass(level: number): string {
  // Tailwind spacing scale: 8 = 2rem = 32px (base 16px)
  const map = [
    'ml-0',
    'ml-8',
    'ml-16',
    'ml-24',
    'ml-32',
    'ml-40',
    'ml-48',
    'ml-56',
    'ml-64',
    'ml-72',
    'ml-80',
  ];
  const idx = Math.max(0, Math.min(level, map.length - 1));
  return map[idx];
}

export default function TodoList({ initialTodos, selectedCategory }: TodoListProps) {
  const { userId } = useUserId();
  const [draggingTodoId, setDraggingTodoId] = React.useState<string | null>(null);
  const [dragOverState, setDragOverState] = React.useState<DragOverState | null>(null);

  // Soft delete a todo
  const handleDelete = async (todo: Todo) => {
    if (!userId) {
      alert("User id not loaded. Please try again.");
      return;
    }
    try {
      const response = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, deleted_by: userId }),
      });
      if (!response.ok) throw new Error("Failed to delete todo");
      setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todo.id));
    } catch {
      alert("Failed to delete todo");
    }
  };

  const [todos, setTodos] = React.useState(initialTodos);
  const [openDescriptions, setOpenDescriptions] = React.useState<{ [id: string]: boolean }>({});
  // Filter todos by selectedCategory if set
  const filteredTodos = selectedCategory && selectedCategory.id
    ? todos.filter(todo => String(todo.category_id) === String(selectedCategory.id))
    : todos;
  const visibleTodoIds = React.useMemo(
    () => new Set(filteredTodos.map((todo) => todo.id)),
    [filteredTodos]
  );

  const [showCompleted, setShowCompleted] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editTodo, setEditTodo] = React.useState<Todo | null>(null);
  const [parentTodo, setParentTodo] = React.useState<Todo | null>(null);

  // Fetch todos from Supabase with filter
  const fetchTodos = async (showCompleted: boolean) => {
    try {
      const params = new URLSearchParams({ showCompleted: String(showCompleted) });
      if (selectedCategory?.id) {
        params.set("category_id", selectedCategory.id);
      }
      const response = await fetch(`/api/todos?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch todos');
      const data = await response.json();
      setTodos(data);
    } catch {
      // error intentionally ignored
    }
  };

  // Toggle show/hide completed todos
  const handleToggleShowCompleted = () => {
    setShowCompleted((prev) => {
      const newValue = !prev;
      fetchTodos(newValue);
      return newValue;
    });
  };

  const handleTodoAdded = (newTodo: Todo) => {
    setTodos((prev: Todo[]) => [newTodo, ...prev]);
    setEditTodo(null);
    setParentTodo(null);
    setShowAddForm(false);
  };

  const handleCreateSubTodo = (todo: Todo) => {
    setParentTodo(todo);
    setShowAddForm(true);
    setEditTodo(null);
  };

  const handleEdit = (todo: Todo) => {
    setEditTodo(todo);
    setShowAddForm(true);
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, completed }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo: ${response.status} ${response.statusText}`);
      }

      const updatedTodo = await response.json();
      setTodos((prev: Todo[]) => {
        return prev.map((t: Todo) => (t.id === id ? updatedTodo : t));
      });
    } catch (error) {
      console.error("Failed to update todo via API route:", error);
    }
  };

  const toggleDescription = (id: string) => {
    setOpenDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDropTodo = async (targetId: string, position: DropPosition) => {
    if (!draggingTodoId) return;

    const categoryScope = selectedCategory?.id;
    const result = computeSiblingReorder(todos, draggingTodoId, targetId, position, visibleTodoIds, categoryScope);
    setDraggingTodoId(null);
    setDragOverState(null);

    if (!result) return;

    const previousTodos = todos;
    setTodos(result.nextTodos);

    try {
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reorder: true,
          updates: result.updates,
          parent_todo: result.scope.parent_todo,
          completed: result.scope.completed,
          ...(typeof result.scope.category_id !== "undefined" ? { category_id: result.scope.category_id } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist todo order");
      }
    } catch (error) {
      console.error("Failed to persist reorder", error);
      setTodos(previousTodos);
      alert("Failed to save new todo order. Reverted changes.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle show/hide completed todos, placed above and right */}
      <div className="flex justify-end">
        <button
          onClick={handleToggleShowCompleted}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition text-sm"
        >
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>
      </div>

      {/* Show/hide AddTodo form link */}
      <div>
        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          className="text-blue-600 hover:underline text-sm mb-2"
        >
          {showAddForm ? "Hide Add Todo" : "Add Todo"}
        </button>
      </div>

      {/* AddTodo form (conditionally rendered) */}
      {showAddForm && (
        <AddTodo
          onTodoAdded={handleTodoAdded}
          editTodo={editTodo}
          parentTodo={parentTodo}
          userId={userId}
          categoryId={selectedCategory?.id}
          onTodoUpdated={async () => {
            await fetchTodos(showCompleted);
            setEditTodo(null);
            setParentTodo(null);
            setShowAddForm(false);
          }}
        />
      )}

      {/* Nested Todo list with indented sub-todos */}
      <ul className="space-y-2">
        {renderTodoTree(
          buildTodoTree([...filteredTodos]),
          0,
          toggleDescription,
          openDescriptions,
          toggleTodo,
          handleCreateSubTodo,
          handleEdit,
          handleDelete,
            userId,
            draggingTodoId,
          dragOverState,
          setDragOverState,
            setDraggingTodoId,
            handleDropTodo
        )}
      </ul>
    </div>
  );
}
