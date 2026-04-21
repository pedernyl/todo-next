import { NextRequest, NextResponse } from "next/server";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { listAdminUpdates, runAdminUpdateOnce, runAdminUpdateForce } from "@/lib/adminUpdates";

type RunUpdateRequest = {
  fileName?: string;
  force?: boolean;
};

export async function GET() {
  try {
    const access = await getAdminAccessCheckResult();
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates = await listAdminUpdates();
    return NextResponse.json({ updates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load updates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccessCheckResult();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = access.email;

  let payload: RunUpdateRequest;
  try {
    payload = (await req.json()) as RunUpdateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = payload.fileName;
  const force = payload.force === true;
  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  let updates;
  try {
    updates = await listAdminUpdates();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load updates";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const target = updates.find((update) => update.fileName === fileName);

  if (!target) {
    return NextResponse.json({ error: "Update file not found" }, { status: 404 });
  }

  if (target.hasBeenExecuted && !force) {
    return NextResponse.json({ error: "Update already executed" }, { status: 409 });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown update execution error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
