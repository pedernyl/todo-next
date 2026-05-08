/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run generate:admin-updates

import * as update_addUsersIsAdminAndSeedFromAllowedUsers_1777381562_0 from "./addUsersIsAdminAndSeedFromAllowedUsers_1777381562";
import * as update_ensureSettingsTableAuditColumns_1777470000_1 from "./ensureSettingsTableAuditColumns_1777470000";
import * as update_migrateSettingsTypeAppLowercaseToApp_1778225819_2 from "./migrateSettingsTypeAppLowercaseToApp_1778225819";
import * as update_normalizeNegativeTodoSortIndexToNull_1777482000_3 from "./normalizeNegativeTodoSortIndexToNull_1777482000";
import * as update_reindexTodoSortIndexPerScope_1777482600_4 from "./reindexTodoSortIndexPerScope_1777482600";
import * as update_renameTodosTableToTodos_1777392359_5 from "./renameTodosTableToTodos_1777392359";
import * as update_renameUserTableToUsers_1777361949_6 from "./renameUserTableToUsers_1777361949";
import * as update_setTodoSortIndexToMinusOne_1776152030_7 from "./setTodoSortIndexToMinusOne_1776152030";
import type { RegisteredAdminUpdate } from "./registry";

export const adminUpdateRegistry: RegisteredAdminUpdate[] = [
  {
    fileName: "addUsersIsAdminAndSeedFromAllowedUsers_1777381562.ts",
    module: update_addUsersIsAdminAndSeedFromAllowedUsers_1777381562_0,
  },
  {
    fileName: "ensureSettingsTableAuditColumns_1777470000.ts",
    module: update_ensureSettingsTableAuditColumns_1777470000_1,
  },
  {
    fileName: "migrateSettingsTypeAppLowercaseToApp_1778225819.ts",
    module: update_migrateSettingsTypeAppLowercaseToApp_1778225819_2,
  },
  {
    fileName: "normalizeNegativeTodoSortIndexToNull_1777482000.ts",
    module: update_normalizeNegativeTodoSortIndexToNull_1777482000_3,
  },
  {
    fileName: "reindexTodoSortIndexPerScope_1777482600.ts",
    module: update_reindexTodoSortIndexPerScope_1777482600_4,
  },
  {
    fileName: "renameTodosTableToTodos_1777392359.ts",
    module: update_renameTodosTableToTodos_1777392359_5,
  },
  {
    fileName: "renameUserTableToUsers_1777361949.ts",
    module: update_renameUserTableToUsers_1777361949_6,
  },
  {
    fileName: "setTodoSortIndexToMinusOne_1776152030.ts",
    module: update_setTodoSortIndexToMinusOne_1776152030_7,
  },
];
