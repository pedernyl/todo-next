export const API_PATHS = {
  CATEGORIES: "/api/categories",
  TODOS: "/api/todos",
  ADMIN: {
    USERS: "/api/admin/users",
    SETTINGS: "/api/admin/settings",
    UPDATES: "/api/admin/updates",
    DATABASE_COPY: "/api/admin/database-copy",
  },
  TEST_DB_STATUS: "/api/test-db-status",
} as const;
