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

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-800">Please wait</h2>
        <p className="mt-2 text-sm text-slate-600">{latestTask?.label || "Working on your request..."}</p>

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
          const combinedSignal =
            signal && init?.signal ? AbortSignal.any([signal, init.signal]) : signal || init?.signal;
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
      {children}
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
