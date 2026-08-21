import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppServerSession } from "../lib/appServerSession";
import { isAdminUserEmail } from "../lib/adminUsers";
import { getAdminAccessCheckResult, isAdminEmail } from "../lib/adminAccess";
import { ADMIN_ACCESS_MESSAGES } from "../constants/admin/adminAccess";

vi.mock("../lib/appServerSession", () => ({
  getAppServerSession: vi.fn(),
}));

vi.mock("../lib/authOptions", () => ({
  authOptions: {},
}));

vi.mock("../lib/adminUsers", () => ({
  isAdminUserEmail: vi.fn(),
}));

const mockedGetAppServerSession = vi.mocked(getAppServerSession);
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
    mockedGetAppServerSession.mockResolvedValueOnce(null);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: ADMIN_ACCESS_MESSAGES.UNAUTHENTICATED });
    expect(mockedIsAdminUserEmail).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when session has no email", async () => {
    mockedGetAppServerSession.mockResolvedValueOnce({ user: {} } as never);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: ADMIN_ACCESS_MESSAGES.UNAUTHENTICATED });
    expect(mockedIsAdminUserEmail).not.toHaveBeenCalled();
  });

  it("returns forbidden when email is not allowed", async () => {
    mockedGetAppServerSession.mockResolvedValueOnce({ user: { email: "denied@example.com" } } as never);
    mockedIsAdminUserEmail.mockResolvedValueOnce(false);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: false, reason: ADMIN_ACCESS_MESSAGES.FORBIDDEN });
    expect(mockedIsAdminUserEmail).toHaveBeenCalledWith("denied@example.com");
  });

  it("returns ok with email when user is allowed", async () => {
    mockedGetAppServerSession.mockResolvedValueOnce({ user: { email: "admin@example.com" } } as never);
    mockedIsAdminUserEmail.mockResolvedValueOnce(true);

    const result = await getAdminAccessCheckResult();

    expect(result).toEqual({ ok: true, email: "admin@example.com" });
    expect(mockedIsAdminUserEmail).toHaveBeenCalledWith("admin@example.com");
  });
});
