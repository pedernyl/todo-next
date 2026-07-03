export const API_MESSAGES = {
  COMMON: {
    UNAUTHORIZED: "Unauthorized",
    FORBIDDEN: "Forbidden",
    INVALID_JSON_BODY: "Invalid JSON body",
  },
  USER_ID: {
    MISSING_EMAIL: "Missing email",
    USER_NOT_FOUND: "User not found",
  },
  TODOS: {
    INVALID_REORDER_PAYLOAD: "Invalid reorder payload",
    INVALID_UPDATE_ENTRY_OBJECT: "Invalid update entry: must be an object",
    INVALID_UPDATE_ENTRY_ID_REQUIRED: "Invalid update entry: id is required",
    INVALID_UPDATE_ENTRY_SORT_INDEX: "Invalid update entry: sort_index must be a finite number",
    INVALID_UPDATE_ENTRY_ID_VALID_NUMBER: "Invalid update entry: id must be a valid number",
    INVALID_UPDATE_ENTRY_ID_NUMBER: "Invalid update entry: id must be a number",
    USER_EMAIL_MISSING: "User email missing",
    REORDER_FAILED: "Failed to reorder todos",
    INVALID_PATCH_PAYLOAD: "Invalid PATCH payload",
    DELETED_BY_REQUIRED: "User id (number) required for deleted_by",
  },
  ADMIN_SETTINGS: {
    LOAD_FAILED: "Failed to load settings",
    NAME_TYPE_REQUIRED: "name and type are required",
    SAVE_FAILED: "Failed to save setting",
  },
  ADMIN_USERS: {
    LOAD_FAILED: "Failed to load users",
  },
  ADMIN_UPDATES: {
    LOAD_FAILED: "Failed to load updates",
    FILE_NAME_REQUIRED: "fileName is required",
    FILE_NOT_FOUND: "Update file not found",
    ALREADY_EXECUTED: "Update already executed",
    UNKNOWN_EXECUTION_ERROR: "Unknown update execution error",
  },
  ADMIN_DATABASE_COPY: {
    LOAD_STATUS_FAILED: "Failed to load database copy status",
    MODE_REQUIRED: "mode must be overwrite or append",
    UNAVAILABLE: "Database copy is not available because test database variables are missing.",
    COMPLETED: "Database copy completed.",
    COPY_FAILED: "Database copy failed",
  },
} as const;
