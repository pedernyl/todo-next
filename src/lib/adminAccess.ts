import { getAppServerSession } from "./appServerSession";
import { isAdminUserEmail } from "./adminUsers";
import { ADMIN_ACCESS_MESSAGES } from "../constants/admin/adminAccess";
import { USER_AUTHENTICATION_MESSAGES } from "../constants/user/userAuthentication";

export type AdminAccessCheckResult =
  | { ok: true; email: string }
  | { ok: false; reason: string };

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  return isAdminUserEmail(email);
}

export async function getAdminAccessCheckResult(): Promise<AdminAccessCheckResult> {
  const session = await getAppServerSession();
  const email = session?.user?.email;

  if (!session || !email) {
    return { ok: false, reason: USER_AUTHENTICATION_MESSAGES.USER.USER_UNAUTHENTICATED };
  }

  if (!(await isAdminEmail(email))) {
    return { ok: false, reason: ADMIN_ACCESS_MESSAGES.FORBIDDEN };
  }

  return { ok: true, email };
}
