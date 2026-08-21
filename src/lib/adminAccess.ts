import { getAppServerSession } from "./appServerSession";
import { isAdminUserEmail } from "./adminUsers";
import { ADMIN_ACCESS_MESSAGES } from "../constants/admin/adminAccess";

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
    return { ok: false, reason: ADMIN_ACCESS_MESSAGES.UNAUTHENTICATED };
  }

  if (!(await isAdminEmail(email))) {
    return { ok: false, reason: ADMIN_ACCESS_MESSAGES.FORBIDDEN };
  }

  return { ok: true, email };
}
