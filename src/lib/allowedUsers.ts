const allowedUsers =
  process.env.NEXTAUTH_ALLOWED_USERS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) || [];

export function isAllowedUserEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return allowedUsers.includes(email.toLowerCase());
}
