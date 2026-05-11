import { NextRequest, NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import {
  copyProductionDatabaseToTest,
  getDatabaseCopyAvailability,
  type DatabaseCopyMode,
} from "@/lib/adminDatabaseCopy";

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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(getAvailabilityResponse());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load database copy status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccessCheckResult();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: CopyRequest;
  try {
    payload = (await req.json()) as CopyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (payload.mode !== "overwrite" && payload.mode !== "append") {
    return NextResponse.json({ error: "mode must be overwrite or append" }, { status: 400 });
  }

  const availability = getDatabaseCopyAvailability();
  if (!availability.available) {
    return NextResponse.json(
      {
        error: "Database copy is not available because test database variables are missing.",
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
      message: "Database copy completed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database copy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
