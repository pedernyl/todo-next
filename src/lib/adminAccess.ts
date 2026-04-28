import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { isAdminUserEmail } from "./adminUsers";

export type AdminAccessCheckResult =
  | { ok: true; email: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  return isAdminUserEmail(email);
}

export async function getAdminAccessCheckResult(): Promise<AdminAccessCheckResult> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (!(await isAdminEmail(email))) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, email };
}
