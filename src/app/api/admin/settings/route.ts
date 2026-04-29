import { NextRequest, NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { loadAdminSettingsGrouped, saveAdminSettingGroup } from "@/lib/adminSettings";

type SaveSettingsRequest = {
  name?: string;
  type?: string;
  settings?: Record<string, unknown>;
};

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groups = await loadAdminSettingsGrouped();
    return NextResponse.json({ groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccessCheckResult();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: SaveSettingsRequest;
  try {
    payload = (await req.json()) as SaveSettingsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.name || !payload.type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  try {
    const setting = await saveAdminSettingGroup({
      name: payload.name,
      type: payload.type,
      settings: payload.settings ?? {},
      changedByEmail: access.email,
    });

    return NextResponse.json({ setting });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save setting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
