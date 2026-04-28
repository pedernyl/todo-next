import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabaseAdminClient", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    })),
  },
}));

import { isAdminUserEmail } from "../lib/adminUsers";

describe("isAdminUserEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXTAUTH_ALLOWED_USERS;
    delete process.env.ADMIN_AUTH_ALLOW_LEGACY_FALLBACK;
  });

  it("returns true when Users.isAdmin is true", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { isAdmin: true }, error: null });

    await expect(isAdminUserEmail("admin@example.com")).resolves.toBe(true);
  });

  it("returns true from legacy fallback when db value is false", async () => {
    process.env.NEXTAUTH_ALLOWED_USERS = "admin@example.com";
    process.env.ADMIN_AUTH_ALLOW_LEGACY_FALLBACK = "true";
    maybeSingleMock.mockResolvedValueOnce({ data: { isAdmin: false }, error: null });

    await expect(isAdminUserEmail("admin@example.com")).resolves.toBe(true);
  });

  it("returns false when fallback is disabled and db value is false", async () => {
    process.env.NEXTAUTH_ALLOWED_USERS = "admin@example.com";
    process.env.ADMIN_AUTH_ALLOW_LEGACY_FALLBACK = "false";
    maybeSingleMock.mockResolvedValueOnce({ data: { isAdmin: false }, error: null });

    await expect(isAdminUserEmail("admin@example.com")).resolves.toBe(false);
  });

  it("returns true when db lookup errors and fallback allows user", async () => {
    process.env.NEXTAUTH_ALLOWED_USERS = "admin@example.com";
    process.env.ADMIN_AUTH_ALLOW_LEGACY_FALLBACK = "true";
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "column Users.isAdmin does not exist" },
    });

    await expect(isAdminUserEmail("admin@example.com")).resolves.toBe(true);
  });

  it("throws when db lookup errors and fallback is disabled", async () => {
    process.env.NEXTAUTH_ALLOWED_USERS = "admin@example.com";
    process.env.ADMIN_AUTH_ALLOW_LEGACY_FALLBACK = "false";
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "column Users.isAdmin does not exist" },
    });

    await expect(isAdminUserEmail("admin@example.com")).rejects.toThrow(
      "Failed to resolve admin status for admin@example.com"
    );
  });
});
