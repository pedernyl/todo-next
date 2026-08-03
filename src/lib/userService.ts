import { authOptions } from "../lib/authOptions";
import { getServerSession } from "next-auth";

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

export async function getAuthenticatedUserId(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("User not authenticated");
  const email = session.user?.email;
  if (!email) throw new Error("User email missing");
  return fetchUserIdByEmail(email);
}