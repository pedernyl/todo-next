import { NextRequest, NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import {
  copyProductionDatabaseToTest,
  getDatabaseCopyAvailability,
  type DatabaseCopyMode,
} from "@/lib/adminDatabaseCopy";
import { API_MESSAGES } from "@/constants/api/apiMessages";

type CopyRequest = {
  mode?: DatabaseCopyMode;
};

function getAvailabilityResponse() {
  const availability = getDatabaseCopyAvailability();
  return {
    available: availability.available,
    missingVariables: availability.missingVariables,
  };
}

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
    }

    return NextResponse.json(getAvailabilityResponse());
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_DATABASE_COPY.LOAD_STATUS_FAILED }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccessCheckResult();
  if (!access.ok) {
    return NextResponse.json({ error: API_MESSAGES.COMMON.FORBIDDEN }, { status: 403 });
  }

  let payload: CopyRequest;
  try {
    payload = (await req.json()) as CopyRequest;
  } catch {
    return NextResponse.json({ error: API_MESSAGES.COMMON.INVALID_JSON_BODY }, { status: 400 });
  }

  if (payload.mode !== "overwrite" && payload.mode !== "append") {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_DATABASE_COPY.MODE_REQUIRED }, { status: 400 });
  }

  const availability = getDatabaseCopyAvailability();
  if (!availability.available) {
    return NextResponse.json(
      {
        error: API_MESSAGES.ADMIN_DATABASE_COPY.UNAVAILABLE,
        missingVariables: availability.missingVariables,
      },
      { status: 409 }
    );
  }

  try {
    await copyProductionDatabaseToTest(payload.mode);
    return NextResponse.json({
      ok: true,
      mode: payload.mode,
      message: API_MESSAGES.ADMIN_DATABASE_COPY.COMPLETED,
    });
  } catch {
    return NextResponse.json({ error: API_MESSAGES.ADMIN_DATABASE_COPY.COPY_FAILED }, { status: 500 });
  }
}
