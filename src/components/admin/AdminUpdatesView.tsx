"use client";

import { useEffect, useMemo, useState } from "react";

type UpdateItem = {
  fileName: string;
  updateKey: string;
  createdUnixTimestamp: number | null;
  hasBeenExecuted: boolean;
  beenExecutedBy: number | null;
  beenExecutedTimestamp: string | null;
};

function formatTimestamp(ts: number | null) {
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleString();
}

export default function AdminUpdatesView() {
  const [availableUpdates, setAvailableUpdates] = useState<UpdateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningFileName, setRunningFileName] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [rerunChecked, setRerunChecked] = useState<Set<string>>(new Set());

  async function loadUpdates(showLoadingState = true) {
    if (showLoadingState) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/admin/updates", { cache: "no-store" });
      const data = (await res.json()) as { updates?: UpdateItem[]; error?: string };

      if (!res.ok || !data.updates) {
        throw new Error(data.error || "Failed to load updates");
      }

      setAvailableUpdates(data.updates);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load updates";
      setError(message);
    } finally {
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadUpdates();
  }, []);

  function toggleRerun(fileName: string, checked: boolean) {
    setRerunChecked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(fileName);
      else next.delete(fileName);
      return next;
    });
  }

  async function runUpdate(fileName: string, force = false) {
    setRunningFileName(fileName);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName, ...(force && { force: true }) }),
      });

      const data = (await res.json()) as {
        error?: string;
        result?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(data.error || "Update execution failed");
      }

      setLastResult(data.result?.message || "Update executed.");
      setRerunChecked((prev) => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
      await loadUpdates(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update execution failed";
      setError(message);
    } finally {
      setRunningFileName(null);
    }
  }

  const hasUpdates = useMemo(() => availableUpdates.length > 0, [availableUpdates.length]);

  return (
    <section className="rounded border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-semibold text-slate-700">Available updates</h2>
      </div>
      {error && <p className="px-5 pt-4 text-sm text-red-700">{error}</p>}
      {lastResult && <p className="px-5 pt-4 text-sm text-emerald-700">{lastResult}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">File</th>
              <th className="px-5 py-3 font-medium">Update key</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium">Executed</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="border-t border-slate-200">
                <td className="px-5 py-3 text-slate-600" colSpan={5}>
                  Loading updates...
                </td>
              </tr>
            )}
            {!isLoading && !hasUpdates && (
              <tr className="border-t border-slate-200">
                <td className="px-5 py-3 text-slate-600" colSpan={5}>
                  No updates found in content/updates.
                </td>
              </tr>
            )}
            {!isLoading &&
              availableUpdates.map((item) => (
                <tr key={item.fileName} className="border-t border-slate-200">
                  <td className="px-5 py-3 text-slate-700">{item.fileName}</td>
                  <td className="px-5 py-3 text-slate-600">{item.updateKey}</td>
                  <td className="px-5 py-3 text-slate-600">{formatTimestamp(item.createdUnixTimestamp)}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {item.hasBeenExecuted
                      ? `Yes (${item.beenExecutedTimestamp ? new Date(item.beenExecutedTimestamp).toLocaleString() : "unknown time"})`
                      : "No"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-2">
                      {item.hasBeenExecuted && (
                        <label className="flex items-center gap-2 text-xs text-slate-500 select-none">
                          <input
                            type="checkbox"
                            checked={rerunChecked.has(item.fileName)}
                            onChange={(e) => toggleRerun(item.fileName, e.target.checked)}
                            disabled={runningFileName === item.fileName}
                            className="accent-sky-700"
                          />
                          Run again
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => void runUpdate(item.fileName, item.hasBeenExecuted)}
                        disabled={
                          runningFileName === item.fileName ||
                          (item.hasBeenExecuted && !rerunChecked.has(item.fileName))
                        }
                        className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {runningFileName === item.fileName
                          ? "Running..."
                          : "Run update"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
