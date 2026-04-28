import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("../lib/authOptions", () => ({
  authOptions: {},
}));

vi.mock("../lib/adminUsers", () => ({
  isAdminUserEmail: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { isAdminUserEmail } from "../lib/adminUsers";
import { getAdminAccessCheckResult, isAdminEmail } from "../lib/adminAccess";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedIsAdminUserEmail = vi.mocked(isAdminUserEmail);

describe("isAdminEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when email is not allowed", async () => {
    mockedIsAdminUserEmail.mockResolvedValueOnce(false);

    const result = await isAdminEmail("denied@example.com");

    expect(result).toBe(false);
    expect(mockedIsAdminUserEmail).toHaveBeenCalledWith("denied@example.com");
  });

  it("returns true when email is allowed", async () => {
    mockedIsAdminUserEmail.mockResolvedValueOnce(true);

    const result = await isAdminEmail("admin@example.com");

    expect(result).toBe(true);
    expect(mockedIsAdminUserEmail).toHaveBeenCalledWith("admin@example.com");
  });
});

describe("getAdminAccessCheckResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated when there is no session", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockedIsAdminUserEmail).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when session has no email", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: {} } as never);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockedIsAdminUserEmail).not.toHaveBeenCalled();
  });

  it("returns forbidden when email is not allowed", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "denied@example.com" } } as never);
    mockedIsAdminUserEmail.mockResolvedValueOnce(false);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(mockedIsAdminUserEmail).toHaveBeenCalledWith("denied@example.com");
  });

  it("returns ok with email when user is allowed", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "admin@example.com" } } as never);
    mockedIsAdminUserEmail.mockResolvedValueOnce(true);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: true, email: "admin@example.com" });
    expect(mockedIsAdminUserEmail).toHaveBeenCalledWith("admin@example.com");
  });
});
