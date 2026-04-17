import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { isAllowedUserEmail } from "./allowedUsers";

export type AdminAccessCheckResult =
  | { ok: true; email: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export function isAdminEmail(email?: string | null): boolean {
  return isAllowedUserEmail(email);
}

export async function getAdminAccessCheckResult(): Promise<AdminAccessCheckResult> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (!isAdminEmail(email)) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, email };
}
