/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run generate:admin-updates

import * as update_add_category_soft_delete_columns_1783318540_0 from "./add_category_soft_delete_columns_1783318540";
import * as update_addUsersIsAdminAndSeedFromAllowedUsers_1777381562_1 from "./addUsersIsAdminAndSeedFromAllowedUsers_1777381562";
import * as update_alterSortIndexToInteger_1778659078_2 from "./alterSortIndexToInteger_1778659078";
import * as update_capitalizeSettingsTypeFirstChar_1778225819_3 from "./capitalizeSettingsTypeFirstChar_1778225819";
import * as update_ensureSettingsTableAuditColumns_1777470000_4 from "./ensureSettingsTableAuditColumns_1777470000";
import * as update_normalizeNegativeTodoSortIndexToNull_1777482000_5 from "./normalizeNegativeTodoSortIndexToNull_1777482000";
import * as update_reassignSortIndexDescendingWithGaps_1778658241_6 from "./reassignSortIndexDescendingWithGaps_1778658241";
import * as update_reindexTodoSortIndexPerScope_1777482600_7 from "./reindexTodoSortIndexPerScope_1777482600";
import * as update_renameTodosTableToTodos_1777392359_8 from "./renameTodosTableToTodos_1777392359";
import * as update_renameUserTableToUsers_1777361949_9 from "./renameUserTableToUsers_1777361949";
import * as update_replaceInsertTodoAtTop_1778661608_10 from "./replaceInsertTodoAtTop_1778661608";
import * as update_setTodoSortIndexToMinusOne_1776152030_11 from "./setTodoSortIndexToMinusOne_1776152030";
import type { RegisteredAdminUpdate } from "./registry";

export const adminUpdateRegistry: RegisteredAdminUpdate[] = [
  {
    fileName: "add_category_soft_delete_columns_1783318540.ts",
    module: update_add_category_soft_delete_columns_1783318540_0,
  },
  {
    fileName: "addUsersIsAdminAndSeedFromAllowedUsers_1777381562.ts",
    module: update_addUsersIsAdminAndSeedFromAllowedUsers_1777381562_1,
  },
  {
    fileName: "alterSortIndexToInteger_1778659078.ts",
    module: update_alterSortIndexToInteger_1778659078_2,
  },
  {
    fileName: "capitalizeSettingsTypeFirstChar_1778225819.ts",
    module: update_capitalizeSettingsTypeFirstChar_1778225819_3,
  },
  {
    fileName: "ensureSettingsTableAuditColumns_1777470000.ts",
    module: update_ensureSettingsTableAuditColumns_1777470000_4,
  },
  {
    fileName: "normalizeNegativeTodoSortIndexToNull_1777482000.ts",
    module: update_normalizeNegativeTodoSortIndexToNull_1777482000_5,
  },
  {
    fileName: "reassignSortIndexDescendingWithGaps_1778658241.ts",
    module: update_reassignSortIndexDescendingWithGaps_1778658241_6,
  },
  {
    fileName: "reindexTodoSortIndexPerScope_1777482600.ts",
    module: update_reindexTodoSortIndexPerScope_1777482600_7,
  },
  {
    fileName: "renameTodosTableToTodos_1777392359.ts",
    module: update_renameTodosTableToTodos_1777392359_8,
  },
  {
    fileName: "renameUserTableToUsers_1777361949.ts",
    module: update_renameUserTableToUsers_1777361949_9,
  },
  {
    fileName: "replaceInsertTodoAtTop_1778661608.ts",
    module: update_replaceInsertTodoAtTop_1778661608_10,
  },
  {
    fileName: "setTodoSortIndexToMinusOne_1776152030.ts",
    module: update_setTodoSortIndexToMinusOne_1776152030_11,
  },
];
