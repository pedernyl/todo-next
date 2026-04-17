import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { isAllowedUserEmail } from "./allowedUsers";

export type AdminAccessCheckResult =
  | { ok: true; email: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export async function getAdminAccessCheckResult(): Promise<AdminAccessCheckResult> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (!isAllowedUserEmail(email)) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, email };
}
