import { ok } from "assert/strict";
import { API_MESSAGES } from "./src/constants/api/apiMessages";


// Type definition for a Todo item
export interface Todo {
  id: string;
  title: string;
  description: string;
  description_html?: string;
  completed: boolean;
  sort_index?: number | null;
  owner_id: number;
  category_id?: string | null;
  parent_todo?: string | null;
  deleted_timestamp?: number | null;
  deleted_by?: number | null;
}

// API responses 
export type httpStatusCode = 200 | 400 | 401 | 403 | 404 | 500;

export interface ApiResponse<T> {
  status: httpStatusCode;
  data?: T;
  code?: string | number;
  error?: string;
  ok?: boolean;
  message?: string;
}

// Type definition for userServiceResponse
export type userServiceResponseData = null | number;

type UserServiceResponses = {
  200: (userId: number) => ApiResponse<number>;
  400: ApiResponse<null>;
  401: ApiResponse<null>;
  403: ApiResponse<null>;
  404: ApiResponse<null>;
  500: ApiResponse<null>;
};

export const userServiceResponse: UserServiceResponses = {
  200: (userId: number) => ({
    status: 200,
    ok: true,
    data: userId,
  }),
  400: { 
    status: 400, 
    ok: false, 
    message: API_MESSAGES.USER.MISSING_EMAIL,
    data: null
  },
  401: { 
    status: 401, 
    ok: false,  
    message: API_MESSAGES.COMMON.UNAUTHORIZED, 
    data: null 
  },
  403: { 
    status: 403, 
    ok: false, 
    message: API_MESSAGES.COMMON.FORBIDDEN,
    data: null
  },
  404: { 
    status: 404, 
    ok: false, 
    message: API_MESSAGES.USER.USER_NOT_FOUND,
    data: null
  },
  500: { 
    status: 500, 
    ok: false, 
    message: API_MESSAGES.COMMON.INTERNAL_SERVER_ERROR,
    data: null
  },
};


