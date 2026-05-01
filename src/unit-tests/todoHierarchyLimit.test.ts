import { describe, expect, it } from "vitest";
import type { Todo } from "../../types";
import { applyHierarchicalTodoLimit } from "../lib/dataService";

function todo(overrides: Partial<Todo>): Todo {
  return {
    id: overrides.id ?? "1",
    title: overrides.title ?? "Todo",
    description: overrides.description ?? "",
    completed: overrides.completed ?? false,
    owner_id: overrides.owner_id ?? 1,
    sort_index: overrides.sort_index ?? 0,
    parent_todo: typeof overrides.parent_todo === "undefined" ? null : overrides.parent_todo,
    category_id: typeof overrides.category_id === "undefined" ? null : overrides.category_id,
    ...overrides,
  };
}

describe("applyHierarchicalTodoLimit", () => {
  it("counts parent and children toward the same limit", () => {
    const todos: Todo[] = [
      todo({ id: "100", sort_index: 0, parent_todo: null, title: "Parent" }),
      todo({ id: "101", sort_index: 1, parent_todo: "100", title: "Child 1" }),
      todo({ id: "102", sort_index: 2, parent_todo: "100", title: "Child 2" }),
      todo({ id: "103", sort_index: 3, parent_todo: "100", title: "Child 3" }),
      todo({ id: "104", sort_index: 4, parent_todo: "100", title: "Child 4" }),
      todo({ id: "105", sort_index: 5, parent_todo: "100", title: "Child 5" }),
    ];

    const limited = applyHierarchicalTodoLimit(todos, 5);

    expect(limited.map((t) => t.id)).toEqual(["100", "101", "102", "103", "104"]);
  });

  it("does not return orphan children before available roots", () => {
    const todos: Todo[] = [
      todo({ id: "1", sort_index: 0, parent_todo: null, title: "Parent A" }),
      todo({ id: "2", sort_index: 0, parent_todo: null, title: "Parent B" }),
      todo({ id: "3", sort_index: 1, parent_todo: "2", title: "Child of B" }),
    ];

    const limited = applyHierarchicalTodoLimit(todos, 2);

    expect(limited.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("returns all todos when no limit is provided", () => {
    const todos: Todo[] = [
      todo({ id: "1", sort_index: 0, parent_todo: null }),
      todo({ id: "2", sort_index: 1, parent_todo: "1" }),
    ];

    const limited = applyHierarchicalTodoLimit(todos);

    expect(limited.map((t) => t.id)).toEqual(["1", "2"]);
  });
});
