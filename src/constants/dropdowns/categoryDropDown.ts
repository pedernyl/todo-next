export const DROPDOWN_OPTIONS = {
    ALL_CATEGORIES: { value: "", label: "All Categories", testId: "all-categories" },
    CREATE_CATEGORY: { value: "__create__", label: "+ Create new category", testId: "create-category" },
} as const;

export const CATEGORY_DROPDOWN_IDS = {
    ROOT: "category-dropdown",
    SELECT: "category-select",
    CATEGORY_OPTION: (categoryId: string) => `category-option-${categoryId}`,
    CREATE_CATEGORY_PANEL: "create-category-panel",
    CLOSE_CREATE_PANEL_BUTTON: "close-create-category-panel-button",
    NEW_CATEGORY_INPUT: "new-category-input",
    NEW_CATEGORY_DESCRIPTION: "new-category-description",
    CREATE_BUTTON: "create-category-button",
    TRIGGER_BUTTON: "category-trigger-button",
    MENU_PANEL: "category-menu-panel",
    CATEGORY_ROW_COMPLETE_BUTTON: (id: string) => `category-complete-btn-${id}`,
    CATEGORY_ROW_EDIT_BUTTON: (id: string) => `category-edit-btn-${id}`,
    CATEGORY_ROW_DELETE_BUTTON: (id: string) => `category-delete-btn-${id}`,
} as const;

export const CATEGORY_DROPDOWN_TEXT = {
    CLOSE: "Close",
    NEW_CATEGORY_PLACEHOLDER: "New category name",
    NEW_CATEGORY_DESCRIPTION_PLACEHOLDER: "Description (optional)",
    CREATE: "Create",
    COMPLETE: "Mark as completed",
    EDIT: "Edit",
    DELETE: "Delete",
    HAS_ACTIVE_TODOS_TOOLTIP: "Cannot delete category with active todos",
    DELETE_CONFIRMATION: (title: string) => `Are you sure you want to delete the category "${title}"?`,
} as const;