import { NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { API_MESSAGES } from "@/constants/api/apiMessages";
import { queryWithTableFallback } from "@/lib/tableCompatibility";

type UserRow = {
  id: number;
  email: string | null;
  isAdmin: boolean | null;
};

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
    }

    const { data, error } = await queryWithTableFallback(
      (tableName) => supabaseAdmin.from(tableName)
      .select("id, email, isAdmin").order("id", { ascending: true }
      ),
      "Users",
      "User"
    );
  
    if (error) {
      throw new Error(error.message);
    }

    const users = ((data ?? []) as UserRow[]).map((row) => ({
      id: row.id,
      email: row.email ?? "",
      isAdmin: Boolean(row.isAdmin),
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_USERS.LOAD_FAILED }, { status: 500 });
  }
}
