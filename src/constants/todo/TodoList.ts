export const TODO_LIST = {
    TOGGLE_SHOW_COMPLETED: { 
        value: "toggle_show_completed", 
        label: "Toggle Show Completed", 
        label_true: "Show Completed",
        label_false: "Hide Completed",
        testId: "toggleShowCompleted" 
    },
    TOGGLE_DESCRIPTION: { 
        value: "toggle_description", 
        label: "Toggle Description",
        show: "Show Description",
        hide: "Hide Description",
        testId: "toggleDescription" 
    },
    COMPLETED_TODO: {
        completed: "completed",
        uncompleted: "uncompleted",
    },
    TOGGLE_COMPLETE: {
        testId: "toggleComplete",
        completed: "Mark as Incomplete",
        uncompleted: "Mark as Complete",
    },
    CREATE_SUB_TODO: {
        testId: "createSubTodo",
        label: "Create Sub Todo",
    },
    EDIT_TODO: {
        testId: "editTodo",
        label: "Edit Todo",
    },
    DELETE_TODO: {
        testId: "deleteTodo",
        label: "Delete Todo",
        confirm: "Are you sure you want to delete this todo?",
    },
    DRAG_TODO: {
        testId: "dragTodo",
        label: "Drag To Reorder Todo",
    },
    // TODO_FILTERS: {
    // ALL_TODOS: { value: "", label: "All Todos", testId: "all-todos" },
    // COMPLETED_TODOS: { value: "completed", label: "Completed Todos", testId: "completed-todos" },
    // INCOMPLETE_TODOS: { value: "incomplete", label: "Incomplete Todos", testId: "incomplete-todos" },
} as const;