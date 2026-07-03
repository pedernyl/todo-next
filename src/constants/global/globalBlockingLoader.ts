export const GLOBAL_BLOCKING_LOADER_IDS = {
  OVERLAY: "global-blocking-loader-overlay",
  DIALOG: "global-blocking-loader-dialog",
  HEADING: "global-blocking-loader-heading",
  DESCRIPTION: "global-blocking-loader-description",
  ELAPSED_TIME: "global-blocking-loader-elapsed-time",
  STILL_WORKING: "global-blocking-loader-still-working",
  CANCELLED_NOTICE: "global-blocking-loader-cancelled-notice",
  ACTIVE_TASKS: "global-blocking-loader-active-tasks",
  CANCEL_BUTTON: "global-blocking-loader-cancel-button",
} as const;

export const GLOBAL_BLOCKING_LOADER_TEXT = {
  HEADING: "Please wait",
  DEFAULT_TASK_LABEL: "Working on your request...",
  ELAPSED_TIME_LABEL: "Elapsed time:",
  STILL_WORKING_PREFIX: "Still working...",
  STILL_WORKING_ELAPSED: (seconds: number) => `${seconds}s elapsed.`,
  CANCELLED_NOTICE: (count: number) =>
    `Cancelled ${count} request(s). Waiting for remaining tasks to finish.`,
  ACTIVE_TASKS: (tasks: number, cancellable: number, nonCancellable: number) =>
    `Active tasks: ${tasks} (${cancellable} cancellable, ${nonCancellable} non-cancellable)`,
  CANCEL_BUTTON: "Cancel",
} as const;