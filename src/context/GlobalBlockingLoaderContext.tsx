"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type BlockingTask = {
  id: number;
  label: string;
  startedAt: number;
  cancellable: boolean;
  controller: AbortController | null;
};

type RunBlockingOptions = {
  label?: string;
  cancellable?: boolean;
};

type BlockingLoaderContextType = {
  runBlocking<T>(operation: (signal?: AbortSignal) => Promise<T>, options?: RunBlockingOptions): Promise<T>;
  runBlockingFetch(input: RequestInfo | URL, init?: RequestInit, options?: RunBlockingOptions): Promise<Response>;
};

const GlobalBlockingLoaderContext = createContext<BlockingLoaderContextType | null>(null);

function combineAbortSignals(
  signalA?: AbortSignal | null,
  signalB?: AbortSignal | null
): AbortSignal | undefined {
  if (!signalA) {
    return signalB ?? undefined;
  }

  if (!signalB) {
    return signalA ?? undefined;
  }

  const abortSignalAny = (AbortSignal as typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;

  if (typeof abortSignalAny === "function") {
    try {
      return abortSignalAny([signalA, signalB]);
    } catch {
      // Fall through to manual signal fan-in for environments with partial support.
    }
  }

  const controller = new AbortController();

  const abortCombined = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  if (signalA.aborted || signalB.aborted) {
    abortCombined();
    return controller.signal;
  }

  const cleanup = () => {
    signalA.removeEventListener("abort", onSignalAAbort);
    signalB.removeEventListener("abort", onSignalBAbort);
  };

  const onSignalAAbort = () => {
    abortCombined();
    cleanup();
  };

  const onSignalBAbort = () => {
    abortCombined();
    cleanup();
  };

  signalA.addEventListener("abort", onSignalAAbort, { once: true });
  signalB.addEventListener("abort", onSignalBAbort, { once: true });

  return controller.signal;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(candidates);
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function BlockingOverlay({
  tasks,
  onCancel,
  cancelledCancellableCount,
}: {
  tasks: BlockingTask[];
  onCancel: () => void;
  cancelledCancellableCount: number;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocusedElementRef = React.useRef<HTMLElement | null>(null);
  const headingId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (tasks.length === 0) {
      return;
    }

    previousFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusables = getFocusableElements(dialog);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      dialog.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      const currentDialog = dialogRef.current;
      if (!currentDialog) {
        return;
      }

      const currentFocusables = getFocusableElements(currentDialog);
      if (currentFocusables.length === 0) {
        event.preventDefault();
        currentDialog.focus();
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      const activeElement = document.activeElement;

      if (!currentDialog.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);

      const previousFocusedElement = previousFocusedElementRef.current;
      if (previousFocusedElement && previousFocusedElement.isConnected) {
        previousFocusedElement.focus();
      }
    };
  }, [tasks.length]);

  if (tasks.length === 0) {
    return null;
  }

  const firstStartedAt = tasks.reduce((min, task) => Math.min(min, task.startedAt), tasks[0].startedAt);
  const elapsedSeconds = Math.max(0, Math.floor((now - firstStartedAt) / 1000));
  const nonCancellableCount = tasks.filter((task) => !task.cancellable).length;
  const cancellableCount = tasks.length - nonCancellableCount;
  const stillWorkingStep = Math.floor(elapsedSeconds / 10);
  const latestTask = tasks[tasks.length - 1];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <h2 id={headingId} className="text-xl font-semibold text-slate-800">Please wait</h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">{latestTask?.label || "Working on your request..."}</p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Elapsed time: <span className="font-semibold">{formatElapsed(elapsedSeconds)}</span>
        </div>

        {stillWorkingStep >= 1 && (
          <p className="mt-3 text-sm text-slate-600">
            Still working... {stillWorkingStep * 10}s elapsed.
          </p>
        )}

        {cancelledCancellableCount > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            Cancelled {cancelledCancellableCount} request(s). Waiting for remaining tasks to finish.
          </p>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Active tasks: {tasks.length} ({cancellableCount} cancellable, {nonCancellableCount} non-cancellable)
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            disabled={cancellableCount === 0}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function GlobalBlockingLoaderProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BlockingTask[]>([]);
  const [cancelledCancellableCount, setCancelledCancellableCount] = useState(0);
  const idCounter = useRef(1);

  const runBlocking = useCallback<BlockingLoaderContextType["runBlocking"]>(async (operation, options) => {
    const taskId = idCounter.current;
    idCounter.current += 1;

    const cancellable = options?.cancellable ?? true;
    const controller = cancellable ? new AbortController() : null;

    const task: BlockingTask = {
      id: taskId,
      label: options?.label || "Working on your request...",
      startedAt: Date.now(),
      cancellable,
      controller,
    };

    setTasks((prev) => [...prev, task]);

    try {
      return await operation(controller?.signal);
    } finally {
      setTasks((prev) => {
        const next = prev.filter((entry) => entry.id !== taskId);
        if (next.length === 0) {
          setCancelledCancellableCount(0);
        }
        return next;
      });
    }
  }, []);

  const runBlockingFetch = useCallback<BlockingLoaderContextType["runBlockingFetch"]>(
    async (input, init, options) => {
      return runBlocking(
        async (signal) => {
          const combinedSignal = combineAbortSignals(signal, init?.signal);
          return fetch(input, { ...init, signal: combinedSignal });
        },
        options
      );
    },
    [runBlocking]
  );

  const cancelAll = useCallback(() => {
    setTasks((prev) => {
      let cancelledCount = 0;

      prev.forEach((task) => {
        if (task.cancellable && task.controller && !task.controller.signal.aborted) {
          task.controller.abort();
          cancelledCount += 1;
        }
      });

      if (cancelledCount > 0) {
        setCancelledCancellableCount((existing) => existing + cancelledCount);
      }

      return prev;
    });
  }, []);

  const contextValue = useMemo<BlockingLoaderContextType>(() => {
    return {
      runBlocking,
      runBlockingFetch,
    };
  }, [runBlocking, runBlockingFetch]);

  return (
    <GlobalBlockingLoaderContext.Provider value={contextValue}>
      <div aria-hidden={tasks.length > 0}>{children}</div>
      <BlockingOverlay
        tasks={tasks}
        onCancel={cancelAll}
        cancelledCancellableCount={cancelledCancellableCount}
      />
    </GlobalBlockingLoaderContext.Provider>
  );
}

export function useGlobalBlockingLoader(): BlockingLoaderContextType {
  const context = useContext(GlobalBlockingLoaderContext);

  if (!context) {
    throw new Error("useGlobalBlockingLoader must be used inside GlobalBlockingLoaderProvider");
  }

  return context;
}
