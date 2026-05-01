"use client";
import React from "react";
import { useUserId } from "../context/UserIdContext";
import { Todo } from "../../types";
import AddTodo from "./AddTodo";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


import type { Category } from "../lib/categoryService";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
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

type SortableTodoItemProps = {
  todo: TodoTreeNode;
  level: number;
  openDescriptions: { [id: string]: boolean };
  toggleDescription: (id: string) => void;
  toggleTodo: (id: string, completed: boolean) => void;
  handleCreateSubTodo: (todo: Todo) => void;
  handleEdit: (todo: Todo) => void;
  handleDelete: (todo: Todo) => void;
  userId: number | null;
  activeTodoId: string | null;
  overTodoId: string | null;
};

function getNormalizedSortIndex(todo: Todo): number {
  if (typeof todo.sort_index !== "number" || Number.isNaN(todo.sort_index) || todo.sort_index < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return todo.sort_index;
}

function normalizeTodoId(id: string | number | null | undefined): string {
  return id == null ? "" : String(id);
}

function normalizeNullableId(id: string | number | null | undefined): string | null {
  const normalized = normalizeTodoId(id);
  return normalized.length > 0 ? normalized : null;
}

function compareTodoOrder(a: Todo, b: Todo): number {
  const completedDiff = Number(a.completed) - Number(b.completed);
  if (completedDiff !== 0) return completedDiff;

  const sortDiff = getNormalizedSortIndex(a) - getNormalizedSortIndex(b);
  if (sortDiff !== 0) return sortDiff;

  const aNum = Number(a.id);
  const bNum = Number(b.id);
  if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
    return a.id.localeCompare(b.id);
  }
  return aNum - bNum;

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
      } else {
        // If a limited payload excludes the parent, keep the child visible as a root node.
        roots.push(todoMap[todo.id]);
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

// Helper to flatten tree into array
function flattenTodoTree(tree: TodoTreeNode[]): Todo[] {
  const result: Todo[] = [];
  function traverse(nodes: TodoTreeNode[]) {
    nodes.forEach((node) => {
      const { children, ...todoData } = node;
      result.push(todoData as Todo);
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  }
  traverse(tree);
  return result;
}

function computeSiblingReorder(
  todos: Todo[],
  movedId: string,
  targetId: string,
  dropPosition: DropPosition,
  tree: TodoTreeNode[],
  categoryId?: string | null
): ReorderComputation | null {
  if (movedId === targetId) return null;

  // Flatten tree to get all todos (not just the flat array which may be incomplete)
  const allTodosFromTree = flattenTodoTree(tree);
  const movedTodo = allTodosFromTree.find((todo) => normalizeTodoId(todo.id) === movedId);
  const targetTodo = allTodosFromTree.find((todo) => normalizeTodoId(todo.id) === targetId);

  if (!movedTodo || !targetTodo) {
    console.error("Todos not found", {
      movedId,
      targetId,
      movedTodoFound: !!movedTodo,
      targetTodoFound: !!targetTodo,
      treeFlattened: allTodosFromTree.map((t) => t.id).slice(0, 20),
    });
    return null;
  }

  const movedParent = normalizeTodoId(movedTodo.parent_todo) || null;
  const targetParent = normalizeTodoId(targetTodo.parent_todo) || null;
  if (movedParent !== targetParent) return null;
  if (Boolean(movedTodo.completed) !== Boolean(targetTodo.completed)) return null;

  const siblings = todos
    .filter((todo) => {
      if ((normalizeTodoId(todo.parent_todo) || null) !== movedParent) return false;
      if (typeof categoryId !== "undefined") {
        if (normalizeNullableId(todo.category_id) !== normalizeNullableId(categoryId)) return false;
      }
      return Boolean(todo.completed) === Boolean(movedTodo.completed);
    })
    .sort(compareTodoOrder);

  const fromIndex = siblings.findIndex((todo) => normalizeTodoId(todo.id) === movedId);
  const targetIndex = siblings.findIndex((todo) => normalizeTodoId(todo.id) === targetId);
  if (fromIndex < 0 || targetIndex < 0) return null;

  let insertionIndex = targetIndex + (dropPosition === "after" ? 1 : 0);
  if (fromIndex < insertionIndex) {
    insertionIndex -= 1;
  }
  if (fromIndex === insertionIndex) return null;

  const reorderedSiblings = arrayMove(siblings, fromIndex, insertionIndex);

  const updates = reorderedSiblings.map((todo, index) => ({
    id: normalizeTodoId(todo.id),
    sort_index: index,
  }));

  const updatesMap = new Map(updates.map((item) => [item.id, item.sort_index]));
  const nextTodos = todos.map((todo) => {
    const nextSortIndex = updatesMap.get(normalizeTodoId(todo.id));
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

function renderSortableTodoGroup(
  tree: TodoTreeNode[],
  level: number,
  sharedProps: Omit<SortableTodoItemProps, "todo" | "level">
) {
  if (tree.length === 0) return null;

  const incomplete = tree.filter((todo) => !todo.completed);
  const completed = tree.filter((todo) => todo.completed);
  const groups = [incomplete, completed].filter((group) => group.length > 0);

  return groups.map((group) => {
    const itemIds = group.map((todo) => todo.id);
    return (
      <SortableContext
        key={`${level}-${group[0].completed ? "completed" : "active"}-${group[0].parent_todo ?? "root"}`}
        items={itemIds}
        strategy={verticalListSortingStrategy}
      >
        {group.map((todo) => (
          <SortableTodoItem
            key={todo.id}
            todo={todo}
            level={level}
            {...sharedProps}
          />
        ))}
      </SortableContext>
    );
  });
}

function SortableTodoItem({
  todo,
  level,
  openDescriptions,
  toggleDescription,
  toggleTodo,
  handleCreateSubTodo,
  handleEdit,
  handleDelete,
  userId,
  activeTodoId,
  overTodoId,
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const todoId = normalizeTodoId(todo.id);
  const isDropTarget = overTodoId === todoId && activeTodoId !== todoId;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow hover:shadow-md transition ${getIndentClass(
        level
      )} ${isDragging ? "opacity-60 ring-2 ring-blue-300 z-20" : ""} ${
        isDropTarget ? "bg-blue-50 ring-2 ring-blue-400" : ""
      }`}
    >
      {isDropTarget && (
        <div className="absolute left-2 right-2 top-0 h-1 bg-blue-600 rounded-full z-20" />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 text-sm"
            aria-label={`Drag todo ${todo.title}`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
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
            {openDescriptions[todoId] ? "Hide Description" : "Show Description"}
          </button>
        </div>
      </div>
      {openDescriptions[todoId] && (
        <div className="mt-2 text-gray-700 text-sm border-l-4 border-blue-200 pl-4">
          {todo.description_html ? (
            <div
              className="prose prose-slate max-w-none break-words text-sm"
              dangerouslySetInnerHTML={{ __html: todo.description_html }}
            />
          ) : (
            <p className="whitespace-pre-wrap">{todo.description}</p>
          )}
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
          {renderSortableTodoGroup(todo.children, level + 1, {
            openDescriptions,
            toggleDescription,
            toggleTodo,
            handleCreateSubTodo,
            handleEdit,
            handleDelete,
            userId,
            activeTodoId,
            overTodoId,
          })}
        </ul>
      )}
    </li>
  );
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
  const { runBlockingFetch } = useGlobalBlockingLoader();
  const [activeTodoId, setActiveTodoId] = React.useState<string | null>(null);
  const [overTodoId, setOverTodoId] = React.useState<string | null>(null);

  // Soft delete a todo
  const handleDelete = async (todo: Todo) => {
    if (!userId) {
      alert("User id not loaded. Please try again.");
      return;
    }
    try {
      const response = await runBlockingFetch(
        "/api/todos",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: todo.id, deleted_by: userId }),
        },
        { label: "Deleting todo...", cancellable: true }
      );
      if (!response.ok) throw new Error("Failed to delete todo");
      setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todo.id));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      alert("Failed to delete todo");
    }
  };

  const [todos, setTodos] = React.useState(initialTodos);
  const [openDescriptions, setOpenDescriptions] = React.useState<{ [id: string]: boolean }>({});

  React.useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);

  const [showCompleted, setShowCompleted] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editTodo, setEditTodo] = React.useState<Todo | null>(null);
  const [parentTodo, setParentTodo] = React.useState<Todo | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  // Fetch todos from Supabase with filter
  const fetchTodos = async (showCompleted: boolean) => {
    try {
      const params = new URLSearchParams({ showCompleted: String(showCompleted) });
      if (selectedCategory?.id) {
        params.set("category_id", selectedCategory.id);
      }
      const response = await runBlockingFetch(
        `/api/todos?${params.toString()}`,
        undefined,
        { label: "Loading todos...", cancellable: true }
      );
      if (!response.ok) throw new Error('Failed to fetch todos');
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
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
      const response = await runBlockingFetch(
        "/api/todos",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, completed }),
        },
        { label: "Updating todo...", cancellable: true }
      );

      if (!response.ok) {
        throw new Error(`Failed to update todo: ${response.status} ${response.statusText}`);
      }

      const updatedTodo = await response.json();
      setTodos((prev: Todo[]) => {
        return prev.map((t: Todo) => (t.id === id ? updatedTodo : t));
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Failed to update todo via API route:", error);
    }
  };

  const toggleDescription = (id: string) => {
    setOpenDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleReorder = async (movedId: string, targetId: string, dropPosition: DropPosition) => {
    if (!movedId || !targetId) return;

    const categoryScope = selectedCategory?.id;
    // Rebuild tree from current todos to avoid stale closure issues
    const currentTree = buildTodoTree([...todos]);
    const result = computeSiblingReorder(todos, movedId, targetId, dropPosition, currentTree, categoryScope);

    if (!result) {
      return;
    }

    const previousTodos = todos;
    setTodos(result.nextTodos);

    try {
      const response = await runBlockingFetch(
        "/api/todos",
        {
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
        },
        { label: "Saving todo order...", cancellable: true }
      );

      if (!response.ok) {
        let details = "";
        try {
          const body = await response.json();
          details = body?.error ? `: ${body.error}` : "";
        } catch {
          // ignore parse failure
        }
        throw new Error(`Failed to persist todo order (${response.status})${details}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setTodos(previousTodos);
        return;
      }
      console.error("Failed to persist reorder", error);
      setTodos(previousTodos);
      alert("Failed to save new todo order. Reverted changes.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTodoId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const nextOverId = event.over ? String(event.over.id) : null;
    if (nextOverId && nextOverId === activeTodoId) return;
    setOverTodoId(nextOverId);
  };

  const handleDragCancel = () => {
    setActiveTodoId(null);
    setOverTodoId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const movedId = String(event.active.id);
    const rawTargetId = event.over ? String(event.over.id) : "";
    const fallbackTargetId = overTodoId && overTodoId !== movedId ? overTodoId : "";
    const targetId = rawTargetId && rawTargetId !== movedId ? rawTargetId : fallbackTargetId;

    const overMiddleY = event.over
      ? event.over.rect.top + event.over.rect.height / 2
      : null;
    const activeMiddleY = event.active.rect.current.translated
      ? event.active.rect.current.translated.top + event.active.rect.current.translated.height / 2
      : null;
    const dropPosition: DropPosition =
      overMiddleY !== null && activeMiddleY !== null && activeMiddleY > overMiddleY
        ? "after"
        : (event.delta.y > 0 ? "after" : "before");

    setActiveTodoId(null);
    setOverTodoId(null);
    if (!targetId) return;
    await handleReorder(movedId, targetId, dropPosition);
  };

  const todoTree = buildTodoTree([...todos]);
  const activeTodo = activeTodoId
    ? todos.find((todo) => normalizeTodoId(todo.id) === activeTodoId)
    : null;

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <ul className="space-y-2">
          {renderSortableTodoGroup(todoTree, 0, {
            openDescriptions,
            toggleDescription,
            toggleTodo,
            handleCreateSubTodo,
            handleEdit,
            handleDelete,
            userId,
            activeTodoId,
            overTodoId,
          })}
        </ul>
        <DragOverlay>
          {activeTodo ? (
            <div className="p-3 rounded-lg bg-white shadow-lg ring-2 ring-blue-300 text-sm">
              {activeTodo.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
