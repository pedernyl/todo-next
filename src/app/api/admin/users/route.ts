import { NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { isAllowedUserEmail } from "@/lib/allowedUsers";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

type UserRow = {
  id: number;
  email: string | null;
};

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("Users")
      .select("id, email")
      .order("id", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const users = ((data ?? []) as UserRow[]).map((row) => ({
      id: row.id,
      email: row.email ?? "",
      isAdmin: isAllowedUserEmail(row.email ?? ""),
    }));

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
