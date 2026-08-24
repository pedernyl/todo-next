import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { fetchUserIdByEmail } from "./userService";
import { isAdminUserEmail } from "./adminUsers"

export function getAppServerSession() {
  return getServerSession(authOptions);
}
 
export async function refreshUserSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    // No authenticated user, or the session has no email
    return;
  }

  if (session && session.user && session.user.email) {
    session.user.id = await fetchUserIdByEmail(session.user.email);
    session.user.isAdmin = await isAdminUserEmail(session.user.email);
    
    return getServerSession(authOptions);
  }
}