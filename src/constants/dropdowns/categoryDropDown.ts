export const DROPDOWN_OPTIONS = {
    ALL_CATEGORIES: { value: "", label: "All Categories", testId: "all-categories" },
    CREATE_CATEGORY: { value: "__create__", label: "+ Create new category", testId: "create-category" },
} as const;

export const CATEGORY_DROPDOWN_IDS = {
    SELECT: "category-select",
    NEW_CATEGORY_INPUT: "new-category-input",
    NEW_CATEGORY_DESCRIPTION: "new-category-description",
    CREATE_BUTTON: "create-category-button",
} as const;