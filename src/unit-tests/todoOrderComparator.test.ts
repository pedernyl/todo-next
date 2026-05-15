import { describe, expect, it } from "vitest";
import type { Todo } from "../../types";
import { compareTodoOrder } from "../components/TodoList";

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: String(overrides.id ?? Math.random()),
    title: overrides.title ?? "todo",
    description: overrides.description ?? "",
    completed: overrides.completed ?? false,
    owner_id: overrides.owner_id ?? 1,
    sort_index:
      Object.prototype.hasOwnProperty.call(overrides, "sort_index")
        ? (overrides.sort_index as Todo["sort_index"])
        : 0,
    parent_todo: typeof overrides.parent_todo === "undefined" ? null : overrides.parent_todo,
    category_id: typeof overrides.category_id === "undefined" ? null : overrides.category_id,
    ...overrides,
  };
}

describe("compareTodoOrder", () => {
  it("sorts valid sort_index values descending and keeps invalid values at the bottom", () => {
    const todos = [
      makeTodo({ id: "10", title: "valid high", sort_index: 3000 }),
      makeTodo({ id: "11", title: "valid low", sort_index: 1000 }),
      makeTodo({ id: "12", title: "null", sort_index: null }),
      makeTodo({ id: "13", title: "nan", sort_index: Number.NaN }),
      makeTodo({ id: "14", title: "infinity", sort_index: Number.POSITIVE_INFINITY }),
    ];

    const sorted = [...todos].sort(compareTodoOrder);
    expect(sorted.map((todo) => todo.id)).toEqual(["10", "11", "14", "13", "12"]);
  });

  it("keeps incomplete todos before completed todos", () => {
    const todos = [
      makeTodo({ id: "1", title: "completed high", completed: true, sort_index: 9000 }),
      makeTodo({ id: "2", title: "incomplete low", completed: false, sort_index: 1000 }),
    ];

    const sorted = [...todos].sort(compareTodoOrder);
    expect(sorted.map((todo) => todo.id)).toEqual(["2", "1"]);
  });
});
