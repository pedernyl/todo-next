import { NextRequest, NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { loadAdminSettingsGrouped, saveAdminSettingGroup } from "@/lib/adminSettings";
import { API_MESSAGES } from "@/constants/api/apiMessages";

type SaveSettingsRequest = {
  name?: string;
  type?: string;
  settings?: Record<string, unknown>;
};

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
    }

    const groups = await loadAdminSettingsGrouped();
    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_SETTINGS.LOAD_FAILED }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccessCheckResult();
  if (!access.ok) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
  }

  let payload: SaveSettingsRequest;
  try {
    payload = (await req.json()) as SaveSettingsRequest;
  } catch {
    return NextResponse.json({ error: API_MESSAGES.COMMON.INVALID_JSON_BODY }, { status: 400 });
  }

  if (!payload.name || !payload.type) {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_SETTINGS.NAME_TYPE_REQUIRED }, { status: 400 });
  }

  try {
    const setting = await saveAdminSettingGroup({
      name: payload.name,
      type: payload.type,
      settings: payload.settings ?? {},
      changedByEmail: access.email,
    });

    return NextResponse.json({ setting });
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_SETTINGS.SAVE_FAILED }, { status: 500 });
  }
}
