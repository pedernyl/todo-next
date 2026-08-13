import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";
import { API_MESSAGES } from "../../../constants/api/apiMessages";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: API_MESSAGES.USER.MISSING_EMAIL }, { status: 400 });
  }
  const { data, error } = await supabase.from("Users").select("id").eq("email", email).single();
  if (error || !data) {
    return NextResponse.json({ error: API_MESSAGES.USER.USER_NOT_FOUND }, { status: 404 });
  }
  return NextResponse.json({ userId: data.id });
}
