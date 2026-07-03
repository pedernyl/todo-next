export const ADD_TODO_IDS = {
  FORM: "add-todo-form",
  PARENT_TODO_INFO: "add-todo-parent-info",
  TITLE_INPUT: "todo-title-input",
  DESCRIPTION_INPUT: "todo-description-input",
  SAVE_BUTTON: "save-todo-button",
} as const;

export const ADD_TODO_TEXT = {
  TITLE_PLACEHOLDER: "Title",
  DESCRIPTION_PLACEHOLDER: "Description",
  SAVE_BUTTON: "Save Todo",
  USER_ID_NOT_LOADED: "User id not loaded. Please try again.",
  CREATE_TODO_FAILED: "Failed to create todo. Please try again.",
  PARENT_TODO_LABEL: "Parent Todo:",
} as const;
