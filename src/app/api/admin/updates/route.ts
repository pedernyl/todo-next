import { NextRequest, NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { listAdminUpdates, runAdminUpdateOnce, runAdminUpdateForce } from "@/lib/adminUpdates";
import { API_MESSAGES } from "@/constants/api/apiMessages";

type RunUpdateRequest = {
  fileName?: string;
  force?: boolean;
};

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
    }

    const updates = await listAdminUpdates();
    return NextResponse.json({ updates });
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_UPDATES.LOAD_FAILED }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccessCheckResult();
  if (!access.ok) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
  }

  const email = access.email;

  let payload: RunUpdateRequest;
  try {
    payload = (await req.json()) as RunUpdateRequest;
  } catch {
    return NextResponse.json({ error: API_MESSAGES.COMMON.INVALID_JSON_BODY }, { status: 400 });
  }

  const fileName = payload.fileName;
  const force = payload.force === true;
  if (!fileName) {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_UPDATES.FILE_NAME_REQUIRED }, { status: 400 });
  }

  let updates;
  try {
    updates = await listAdminUpdates();
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_UPDATES.LOAD_FAILED }, { status: 500 });
  }

  const target = updates.find((update) => update.fileName === fileName);

  if (!target) {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_UPDATES.FILE_NOT_FOUND }, { status: 404 });
  }

  if (target.hasBeenExecuted && !force) {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_UPDATES.ALREADY_EXECUTED }, { status: 409 });
  }

  try {
    const runner = force ? runAdminUpdateForce : runAdminUpdateOnce;
    const result = await runner(target.updateKey, target.fileName, email);
    return NextResponse.json({
      ok: true,
      fileName: target.fileName,
      updateKey: target.updateKey,
      result,
    });
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_UPDATES.UNKNOWN_EXECUTION_ERROR }, { status: 500 });
  }
}
