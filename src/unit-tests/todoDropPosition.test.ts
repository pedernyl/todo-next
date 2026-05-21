import { describe, expect, it } from "vitest";
import { resolveDropPosition } from "../components/TodoList";

describe("resolveDropPosition", () => {
  it("returns after when active midpoint is below target midpoint", () => {
    const result = resolveDropPosition(100, 130, -5);
    expect(result).toBe("after");
  });

  it("returns before when active midpoint is above target midpoint", () => {
    const result = resolveDropPosition(100, 70, 8);
    expect(result).toBe("before");
  });

  it("falls back to downward delta when midpoint data is unavailable", () => {
    const result = resolveDropPosition(null, null, 10);
    expect(result).toBe("after");
  });

  it("falls back to before when midpoint data is unavailable and delta is upward", () => {
    const result = resolveDropPosition(null, null, -1);
    expect(result).toBe("before");
  });

  it("supports resolved-descendant target scenarios for both before and after", () => {
    const afterResult = resolveDropPosition(200, 230, -3);
    const beforeResult = resolveDropPosition(200, 170, 3);

    expect(afterResult).toBe("after");
    expect(beforeResult).toBe("before");
  });
});
