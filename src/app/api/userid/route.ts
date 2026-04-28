import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  // Try new table name first; fall back to old name during rollout.
  let result = await supabase.from("Users").select("id").eq("email", email).single();
  if (result.error) {
    result = await supabase.from("User").select("id").eq("email", email).single();
  }
  if (result.error || !result.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ userId: result.data.id });
}
