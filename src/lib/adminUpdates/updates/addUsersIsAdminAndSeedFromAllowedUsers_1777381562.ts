import { parseAllowedAdminEmailsFromEnv } from "../../adminUsers";
import { supabaseAdmin } from "../../supabaseAdminClient";

export async function runAdminUpdate() {
  const { error: migrationError } = await supabaseAdmin.rpc(
    "add_users_is_admin_column_if_missing"
  );

  if (migrationError) {
    throw new Error(`Failed to add Users.isAdmin column: ${migrationError.message}`);
  }

  const allowedAdminEmails = [...new Set(parseAllowedAdminEmailsFromEnv())];

  if (allowedAdminEmails.length === 0) {
    return {
      message:
        "Ensured Users.isAdmin exists. No admin seed emails were found in NEXTAUTH_ALLOWED_USERS.",
    };
  }

  // Use an RPC for seeding to avoid schema-cache issues right after the column is added.
  const { data: seededCount, error: seedError } = await supabaseAdmin.rpc(
    "seed_admin_users_by_email",
    { emails: allowedAdminEmails }
  );

  if (seedError) {
    throw new Error(`Failed to seed admin users: ${seedError.message}`);
  }

  const seededUsers: number = seededCount ?? 0;

  return {
    message: `Ensured Users.isAdmin exists and seeded ${seededUsers} admin user(s) from NEXTAUTH_ALLOWED_USERS.`,
  };
}
