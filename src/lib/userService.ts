import { getAppServerSession } from "./appServerSession";
import { ApiResponse, userServiceResponse } from "../../types";

export async function fetchUserIdByEmail(email: string): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL environment variable is not set");
  }
  const userIdRes = await fetch(
    `${baseUrl}/api/userid?email=${encodeURIComponent(email)}`,
    { cache: "no-store" }
  );
  if (!userIdRes.ok) throw new Error("Could not fetch user id");
  const { userId } = await userIdRes.json();
  if (typeof userId !== 'number') throw new Error('userId must be a number');
  return userId;
}

export async function tryGetAuthenticatedUserId(): Promise<ApiResponse<null | number>> {
  const session = await getAppServerSession();
  if (!session) {
    return userServiceResponse[401];
  }

  const email = session.user?.email;
  if (!email) {
    return {
      ok: false,
      code: "USER_EMAIL_MISSING",
      status: 400,
      message: "User email missing",
    };
  }
  try {
    const userId = await fetchUserIdByEmail(email);
    return {
      ok: true,
      status: 200,
      data: userId,
    };
  } catch (error) {
    return {
      ok: false,
      code: "lookup-failed",
      status: 500,
      message: "Could not fetch user id",
    };
  }
}