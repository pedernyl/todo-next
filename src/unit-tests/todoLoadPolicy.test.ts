import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { testState } = vi.hoisted(() => ({
  testState: {
    settingsRow: null as null | { settings: Record<string, unknown> },
    queryError: null as null | { message: string },
  },
}));

vi.mock("../lib/supabaseAdminClient", () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const filters: Record<string, string> = {};
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          filters[column] = value;
          return builder;
        },
        maybeSingle: async () => {
          if (testState.queryError) {
            return { data: null, error: testState.queryError };
          }
          return { data: testState.settingsRow, error: null };
        },
      };
      return builder;
    }),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { getTodoLoadPolicy, computeEffectiveLimit } from "../lib/todoLoadPolicy";

// ---------------------------------------------------------------------------
// computeEffectiveLimit — pure function, no mocks needed
// ---------------------------------------------------------------------------

describe("computeEffectiveLimit", () => {
  const policy = { defaultLoadLimit: 50, maxLoadLimit: 200 };

  it("returns defaultLoadLimit when no requestedLimit is provided", () => {
    expect(computeEffectiveLimit(policy)).toBe(50);
  });

  it("returns defaultLoadLimit when requestedLimit is null", () => {
    expect(computeEffectiveLimit(policy, null)).toBe(50);
  });

  it("uses the requestedLimit when it is within bounds", () => {
    expect(computeEffectiveLimit(policy, 100)).toBe(100);
  });

  it("clamps requestedLimit up to 1 when below minimum", () => {
    expect(computeEffectiveLimit(policy, 0)).toBe(1);
    expect(computeEffectiveLimit(policy, -10)).toBe(1);
  });

  it("clamps requestedLimit down to maxLoadLimit when above maximum", () => {
    expect(computeEffectiveLimit(policy, 500)).toBe(200);
    expect(computeEffectiveLimit(policy, 201)).toBe(200);
  });

  it("floors a fractional requestedLimit", () => {
    expect(computeEffectiveLimit(policy, 25.9)).toBe(25);
  });

  it("ignores NaN requestedLimit and falls back to defaultLoadLimit", () => {
    expect(computeEffectiveLimit(policy, NaN)).toBe(50);
  });

  it("clamps defaultLoadLimit to maxLoadLimit when default exceeds max", () => {
    const tightPolicy = { defaultLoadLimit: 300, maxLoadLimit: 100 };
    expect(computeEffectiveLimit(tightPolicy)).toBe(100);
  });

  it("respects a maxLoadLimit of 1", () => {
    const minPolicy = { defaultLoadLimit: 50, maxLoadLimit: 1 };
    expect(computeEffectiveLimit(minPolicy, 999)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getTodoLoadPolicy — reads from Settings table via supabaseAdmin
// ---------------------------------------------------------------------------

describe("getTodoLoadPolicy", () => {
  beforeEach(() => {
    testState.settingsRow = null;
    testState.queryError = null;
  });

  it("returns hardcoded defaults when no DB row exists", async () => {
    testState.settingsRow = null;
    const policy = await getTodoLoadPolicy();
    expect(policy.defaultLoadLimit).toBe(50);
    expect(policy.maxLoadLimit).toBe(200);
  });

  it("returns hardcoded defaults on query error", async () => {
    testState.queryError = { message: "connection refused" };
    const policy = await getTodoLoadPolicy();
    expect(policy.defaultLoadLimit).toBe(50);
    expect(policy.maxLoadLimit).toBe(200);
  });

  it("returns stored values when a valid DB row exists", async () => {
    testState.settingsRow = { settings: { defaultLoadLimit: 75, maxLoadLimit: 500 } };
    const policy = await getTodoLoadPolicy();
    expect(policy.defaultLoadLimit).toBe(75);
    expect(policy.maxLoadLimit).toBe(500);
  });

  it("falls back to defaults for invalid stored values", async () => {
    testState.settingsRow = { settings: { defaultLoadLimit: "invalid", maxLoadLimit: -5 } };
    const policy = await getTodoLoadPolicy();
    expect(policy.defaultLoadLimit).toBe(50);
    expect(policy.maxLoadLimit).toBe(200);
  });

  it("falls back per-field: uses stored defaultLoadLimit but default maxLoadLimit when maxLoadLimit is missing", async () => {
    testState.settingsRow = { settings: { defaultLoadLimit: 30 } };
    const policy = await getTodoLoadPolicy();
    expect(policy.defaultLoadLimit).toBe(30);
    expect(policy.maxLoadLimit).toBe(200);
  });

  it("returns defaults when settings object is empty", async () => {
    testState.settingsRow = { settings: {} };
    const policy = await getTodoLoadPolicy();
    expect(policy.defaultLoadLimit).toBe(50);
    expect(policy.maxLoadLimit).toBe(200);
  });
});
