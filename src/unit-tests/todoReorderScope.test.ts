import { beforeEach, describe, expect, it, vi } from "vitest";

let mockExistingTodos: Array<{
  id: string;
  owner_id: number;
  parent_todo: string | null;
  completed: boolean;
  category_id: string | null;
  deleted_timestamp: number | null;
}> = [];

vi.mock("../lib/supabaseClient", () => {
  const supabase = {
    from: (_table: string) => ({
      select: (_columns: string) => ({
        eq: (_field: string, _value: unknown) => ({
          in: (_inField: string, _ids: string[]) =>
            Promise.resolve({ data: mockExistingTodos, error: null }),
        }),
      }),
      update: (_payload: { sort_index: number }) => ({
        eq: (_field: string, _value: unknown) => ({
          eq: (_ownerField: string, _ownerValue: unknown) => Promise.resolve({ error: null }),
        }),
      }),
    }),
  };

  return { supabase };
});

import { reorderTodoSiblings } from "../lib/dataService";

describe("reorderTodoSiblings nested scope", () => {
  beforeEach(() => {
    mockExistingTodos = [];
  });

  it("rejects nested reorder when category scope does not match siblings", async () => {
    mockExistingTodos = [
      {
        id: "291",
        owner_id: 1,
        parent_todo: "270",
        completed: false,
        category_id: "cat-b",
        deleted_timestamp: null,
      },
      {
        id: "292",
        owner_id: 1,
        parent_todo: "270",
        completed: false,
        category_id: "cat-b",
        deleted_timestamp: null,
      },
    ];

    await expect(
      reorderTodoSiblings(
        1,
        [
          { id: "291", sort_index: 1 },
          { id: "292", sort_index: 0 },
        ],
        {
          parent_todo: "270",
          completed: false,
          category_id: "cat-a",
        }
      )
    ).rejects.toThrow("Invalid reorder scope for one or more todos");
  });
});
