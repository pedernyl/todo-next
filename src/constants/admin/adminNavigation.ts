export const ADMIN_TEST_IDS = {
  ENTRY_LINK: "admin-link",
  TODOS_LINK: "admin-link-todos",
  viewLink: (viewKey: string) => `admin-link-${viewKey}`,
} as const;
