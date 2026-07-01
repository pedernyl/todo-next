export const TODO_LIST_IDS = {
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
    DRAG_TODO: {
        testId: "dragTodo",
    },
    TOGGLE_ADD_TODO_FORM: {
        testId: "toggleAddTodoForm",
    },
} as const;

export const TODO_LIST_TEXT = {
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
        label: "Create Sub Todo",
    },
    EDIT_TODO: {
        label: "Edit Todo",
    },
    DELETE_TODO: {
        label: "Delete Todo",
        confirm: "Are you sure you want to delete this todo?",
    },
    DRAG_TODO: {
        label: "Drag To Reorder Todo",
    },
} as const;