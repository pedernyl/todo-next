"use server";
import { getAppServerSession } from "./appServerSession";
import { ApiResponse, userServiceResponse, userServiceResponseData } from "../../types";
import { API_MESSAGES } from "../constants/api/apiMessages";
import { supabase } from "./supabaseClient";
import { queryWithTableFallback } from "./tableCompatibility";

export async function fetchUserIdByEmail(email: string): Promise<number> {
  const { data, error } = await queryWithTableFallback(
    (tableName) => supabase.from(tableName).select("id").eq("email", email).single(),
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