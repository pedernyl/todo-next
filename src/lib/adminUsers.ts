import { supabaseAdmin } from "./supabaseAdminClient";

type AdminStatusRow = {
  isAdmin: boolean | null;
};

export function parseAllowedAdminEmailsFromEnv(): string[] {
  return (process.env.NEXTAUTH_ALLOWED_USERS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isLegacyAdminFallbackEnabled(): boolean {
  const raw = (process.env.ADMIN_AUTH_ALLOW_LEGACY_FALLBACK || "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

function isLegacyAllowedAdminEmail(email?: string | null): boolean {
  if (!email || !isLegacyAdminFallbackEnabled()) {
    return false;
  }

  return parseAllowedAdminEmailsFromEnv().includes(email.trim().toLowerCase());
}

function normalizeEmail(email?: string | null): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

export async function isAdminUserEmail(email?: string | null): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  const legacyAllowed = isLegacyAllowedAdminEmail(normalizedEmail);

  const { data, error } = await supabaseAdmin
    .from("Users")
    .select("isAdmin")
    .eq("email", normalizedEmail) 
    .maybeSingle();

  if (error) {
    // Transitional fallback while rolling out Users.isAdmin.
    if (legacyAllowed) {
      return true;
    }

    throw new Error(`Failed to resolve admin status for ${normalizedEmail}: ${error.message}`);
  }

  const row = (data as AdminStatusRow | null) ?? null;
  return Boolean(row?.isAdmin) || legacyAllowed;
}
