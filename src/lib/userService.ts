"use server";
import { getAppServerSession } from "./appServerSession";
import { ApiResponse, userServiceResponse, userServiceResponseData } from "../../types";
import { API_MESSAGES } from "../constants/api/apiMessages";
import { supabase } from "./supabaseClient";
import { queryWithTableFallback } from "./tableCompatibility";
import type { email } from "../../types";

export async function fetchUserIdByEmail(email: email): Promise<number> {
  if (!email) {
    throw new Error(API_MESSAGES.USER.MISSING_EMAIL);
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await queryWithTableFallback(
    (tableName) => supabase.from(tableName).select("id").eq("email", normalizedEmail).single(),
    "Users",
    "User"
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(API_MESSAGES.USER.USER_NOT_FOUND);
  }
 
  return data.id;
  
}

export async function getAuthenticatedUserIdResponse(): Promise<ApiResponse<userServiceResponseData>> {
  const session = await getAppServerSession();
  if (!session) {
    return userServiceResponse[401];
  }

  const email = session.user?.email;
  if (!email) {
    return userServiceResponse[400];
  }
  try {
    const userId = await fetchUserIdByEmail(email);
    return userServiceResponse[200](userId);
  } catch (error) {
    return userServiceResponse[500];
  }
}

export async function getAuthenticatedUserId(): Promise<userServiceResponseData> {
  const userIdResponse = await getAuthenticatedUserIdResponse();
  if (!userIdResponse.ok || typeof userIdResponse.data !== 'number') {
    throw new Error(API_MESSAGES.COMMON.UNAUTHORIZED);
  }
  return userIdResponse.data;
}

export async function isAuthenticatedUserByEmail(email: email): Promise<boolean> {
  try {
    const userId = await fetchUserIdByEmail(email);
    if (!userId || typeof userId !== 'number') {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}