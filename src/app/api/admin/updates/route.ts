import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isAllowedUserEmail } from "@/lib/allowedUsers";
import { listAdminUpdates, runAdminUpdateOnce } from "@/lib/adminUpdates";

type RunUpdateRequest = {
  fileName?: string;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!session || !isAllowedUserEmail(email)) {
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
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email || !isAllowedUserEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: RunUpdateRequest;
  try {
    payload = (await req.json()) as RunUpdateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = payload.fileName;
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

  if (target.hasBeenExecuted) {
    return NextResponse.json({ error: "Update already executed" }, { status: 409 });
  }

  try {
    const result = await runAdminUpdateOnce(target.updateKey, target.fileName, email);
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
