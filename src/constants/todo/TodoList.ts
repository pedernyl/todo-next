export const TODO_LIST_IDS = {
    ROOT: "todo-list-root",
    LIST: "todo-list-items",
    TODO_ITEM: {
        testId: "todoItem",
    },
    TOGGLE_SHOW_COMPLETED: {
        key: "toggle_show_completed",
        testId: "toggleShowCompleted",
    },
    TOGGLE_DESCRIPTION: {
        key: "toggle_description",
        testId: "toggleDescription",
    },
    COMPLETED_TODO: {
        completed: "completed",
        uncompleted: "uncompleted",
    },
    TOGGLE_COMPLETE: {
        testId: "toggleComplete",
    },
    CREATE_SUB_TODO: {
        testId: "createSubTodo",
    },
    EDIT_TODO: {
        testId: "editTodo",
    },
    DELETE_TODO: {
        testId: "deleteTodo",
    },
    DESCRIPTION: {
        containerTestId: "todoDescriptionContainer",
        contentTestId: "todoDescriptionContent",
    },
    DRAG_TODO: {
        testId: "dragTodo",
    },
    TOGGLE_ADD_TODO_FORM: {
        testId: "toggleAddTodoForm",
    },
} as const;

export const TODO_LIST_TEXT = {
    TOGGLE_ADD_TODO_FORM: {
        show: "Add Todo",
        hide: "Hide Add Todo",
    },
    TOGGLE_SHOW_COMPLETED: {
        show: "Show Completed",
        hide: "Hide Completed",
    },
    TOGGLE_DESCRIPTION: {
        show: "Show Description",
        hide: "Hide Description",
    },
    TOGGLE_COMPLETE: {
        complete: "Mark as Complete",
        incomplete: "Mark as Incomplete",
    },
    CREATE_SUB_TODO: {
        label: "Create Sub-Todo",
    },
    EDIT_TODO: {
        label: "Edit Todo",
    },
    DELETE_TODO: {
        label: "Delete Todo",
        confirm: "Are you sure you want to delete this todo?",
        failed: "Failed to delete todo",
    },
    DRAG_TODO: {
        label: "Drag To Reorder Todo",
    },
    ALERTS: {
        USER_ID_NOT_LOADED: "User id not loaded. Please try again.",
        SAVE_ORDER_FAILED: "Failed to save new todo order. Reverted changes.",
    },
} as const;