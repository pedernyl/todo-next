export const GLOBAL = {
    APP_NAME: "Todo App",
    LOADING_WITH_DOTS: "Loading...",
    ERROR: "An error occurred. Please try again.",
    NO_TODOS: "No todos found. Create your first todo!",
    LOADER_LABELS: {
      // Todo operations
      LOADING_TODOS: "Loading todos...",
      LOADING_MORE_TODOS: "Loading more todos...",
      SAVING_TODO_ORDER: "Saving todo order...",
      UPDATING_TODO: "Updating todo...",
      DELETING_TODO: "Deleting todo...",
      CREATING_TODO: "Creating todo...",
      // Category operations
      LOADING_CATEGORIES: "Loading categories...",
      CREATING_CATEGORY: "Creating category...",
      // Admin operations
      LOADING_ADMIN_SETTINGS: "Loading admin settings...",
      LOADING_ADMIN_USERS: "Loading admin users...",
      LOADING_ADMIN_UPDATES: "Loading admin updates...",
      LOADING_DATABASE_COPY_STATUS: "Loading database copy status...",
      COPYING_DATABASE: "Copying production database to test database...",
      // Auth
      LOADING_ACCOUNT_INFO: "Loading account information...",
    },
    UI_TEXT: {
      TODOS: {
        ALL_LOADED: "All todos loaded",
        LOADING_STATE: "Loading todos...",
        LOADING_MORE: "Loading more todos...",
      },
      ADMIN: {
        LOADING_SETTINGS: "Loading settings...",
        LOADING_USERS: "Loading users...",
        LOADING_UPDATES: "Loading updates...",
        LOADING_DATABASE_COPY: "Loading database copy status...",
        NO_USERS_FOUND: "No users found.",
      },
    },
} as const;