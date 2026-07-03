export const ADMIN_TEST_IDS = {
  PAGE: "admin-page",
  SIDEBAR: "admin-sidebar",
  SIDEBAR_TITLE: "admin-sidebar-title",
  HEADER_TITLE: "admin-header-title",
  ENTRY_LINK: "admin-link",
  TODOS_LINK: "admin-link-todos",
  viewLink: (viewKey: string) => `admin-link-${viewKey}`,
} as const;

export const ADMIN_NAV_TEXT = {
  ENTRY_LINK: "Admin",
  TODOS_LINK: "Todos",
  SIDEBAR_TITLE: "Admin",
  DEFAULT_ACTIVE_LABEL: "Admin",
  VIEWS: [
    { key: "home", label: "Home" },
    { key: "settings", label: "Settings" },
    { key: "database-copy", label: "Database copy" },
    { key: "updates", label: "Updates" },
    { key: "users", label: "Users" },
    { key: "about", label: "About" },
  ],
} as const;
