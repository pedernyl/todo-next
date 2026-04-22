import { beforeEach, describe, expect, it, vi } from "vitest";

let mockExistingTodos: Array<{
  id: string;
  owner_id: number;
  parent_todo: string | null;
  completed: boolean;
  category_id: string | null;
  deleted_timestamp: number | null;
}> = [];
let updatedTodosResult: Array<{ id: string; sort_index: number }> = [];
let updateIdEqValues: unknown[] = [];
let updateSortIndexPayloads: number[] = [];
let updateOwnerEqValues: unknown[] = [];

vi.mock("../lib/supabaseClient", () => {
  const supabase = {
    from: (_table: string) => ({
      select: (columns: string) => {
        if (columns === "*") {
          return {
            eq: (_field: string, _value: unknown) => ({
              in: (_inField: string, _ids: string[]) => ({
                order: (_orderField: string, _opts: { ascending: boolean }) => ({
                  order: (_orderField2: string, _opts2: { ascending: boolean }) =>
                    Promise.resolve({ data: updatedTodosResult, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          eq: (_field: string, _value: unknown) => ({
            in: (_inField: string, _ids: string[]) =>
              Promise.resolve({ data: mockExistingTodos, error: null }),
          }),
        };
      },
      update: (_payload: { sort_index: number }) => ({
        ...(() => {
          updateSortIndexPayloads.push(_payload.sort_index);
          return {};
        })(),
        eq: (field: string, value: unknown) => {
          if (field === "id") {
            updateIdEqValues.push(value);
          }
          return {
          eq: (ownerField: string, ownerValue: unknown) => {
            if (ownerField === "owner_id") {
              updateOwnerEqValues.push(ownerValue);
            }
            return Promise.resolve({ error: null });
          },
          };
        },
      }),
    }),
  };

  return { supabase };
});

import { reorderTodoSiblings } from "../lib/dataService";

describe("reorderTodoSiblings nested scope", () => {
  beforeEach(() => {
    mockExistingTodos = [];
    updatedTodosResult = [];
    updateIdEqValues = [];
    updateSortIndexPayloads = [];
    updateOwnerEqValues = [];
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

  it("coerces numeric ids to strings for update eq filters", async () => {
    mockExistingTodos = [
      {
        id: "291",
        owner_id: 1,
        parent_todo: "270",
        completed: false,
        category_id: "cat-a",
        deleted_timestamp: null,
      },
      {
        id: "292",
        owner_id: 1,
        parent_todo: "270",
        completed: false,
        category_id: "cat-a",
        deleted_timestamp: null,
      },
    ];
    updatedTodosResult = [
      { id: "292", sort_index: 0 },
      { id: "291", sort_index: 1 },
    ];

    await reorderTodoSiblings(
      1,
      [
        { id: 291 as unknown as string, sort_index: 1 },
        { id: "292", sort_index: 0 },
      ],
      {
        parent_todo: "270",
        completed: false,
        category_id: "cat-a",
      }
    );

    expect(updateIdEqValues).toEqual(["291", "292"]);
  });

  it("applies expected sort_index writes for a valid scoped reorder", async () => {
    mockExistingTodos = [
      {
        id: "291",
        owner_id: 1,
        parent_todo: "270",
        completed: false,
        category_id: "cat-a",
        deleted_timestamp: null,
      },
      {
        id: "292",
        owner_id: 1,
        parent_todo: "270",
        completed: false,
        category_id: "cat-a",
        deleted_timestamp: null,
      },
    ];
    updatedTodosResult = [
      { id: "292", sort_index: 0 },
      { id: "291", sort_index: 1 },
    ];

    const result = await reorderTodoSiblings(
      1,
      [
        { id: 292 as unknown as string, sort_index: 0 },
        { id: "291", sort_index: 1 },
      ],
      {
        parent_todo: "270",
        completed: false,
        category_id: "cat-a",
      }
    );

    expect(updateIdEqValues).toEqual(["292", "291"]);
    expect(updateSortIndexPayloads).toEqual([0, 1]);
    expect(updateOwnerEqValues).toEqual([1, 1]);
    expect(result).toEqual(updatedTodosResult);
  });

  it("rejects reorder updates with invalid sort_index values", async () => {
    await expect(
      reorderTodoSiblings(
        1,
        [{ id: "291", sort_index: Number.NaN }],
        {
          parent_todo: "270",
          completed: false,
          category_id: "cat-a",
        }
      )
    ).rejects.toThrow("sort_index must be a finite non-negative number");
  });
});
