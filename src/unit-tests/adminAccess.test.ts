import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("../lib/authOptions", () => ({
  authOptions: {},
}));

vi.mock("../lib/allowedUsers", () => ({
  isAllowedUserEmail: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { isAllowedUserEmail } from "../lib/allowedUsers";
import { getAdminAccessCheckResult } from "../lib/adminAccess";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedIsAllowedUserEmail = vi.mocked(isAllowedUserEmail);

describe("getAdminAccessCheckResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated when there is no session", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockedIsAllowedUserEmail).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when session has no email", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: {} } as never);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockedIsAllowedUserEmail).not.toHaveBeenCalled();
  });

  it("returns forbidden when email is not allowed", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "denied@example.com" } } as never);
    mockedIsAllowedUserEmail.mockReturnValueOnce(false);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(mockedIsAllowedUserEmail).toHaveBeenCalledWith("denied@example.com");
  });

  it("returns ok with email when user is allowed", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { email: "admin@example.com" } } as never);
    mockedIsAllowedUserEmail.mockReturnValueOnce(true);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: true, email: "admin@example.com" });
    expect(mockedIsAllowedUserEmail).toHaveBeenCalledWith("admin@example.com");
  });
});
