"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_PATHS } from "../../constants/api/apiPaths";
import { useGlobalBlockingLoader } from "../../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../../constants/global/global";
import { ADMIN_VIEW_IDS, ADMIN_VIEW_TEXT } from "../../constants/admin/adminViews";

type UpdateItem = {
  fileName: string;
  updateKey: string;
  createdUnixTimestamp: number | null;
  hasBeenExecuted: boolean;
  beenExecutedBy: number | null;
  beenExecutedTimestamp: string | null;
};

function formatTimestamp(ts: number | null) {
  if (!ts) return ADMIN_VIEW_TEXT.UPDATES.UNKNOWN;
  return new Date(ts * 1000).toLocaleString();
}

export default function AdminUpdatesView() {
  const [availableUpdates, setAvailableUpdates] = useState<UpdateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningFileName, setRunningFileName] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [rerunChecked, setRerunChecked] = useState<Set<string>>(new Set());
  const { runBlockingFetch } = useGlobalBlockingLoader();

  const loadUpdates = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await runBlockingFetch(
        API_PATHS.ADMIN.UPDATES,
        { cache: "no-store" },
        { label: GLOBAL.LOADER_LABELS.LOADING_ADMIN_UPDATES, cancellable: true }
      );
      const data = (await res.json()) as { updates?: UpdateItem[]; error?: string };

      if (!res.ok || !data.updates) {
        throw new Error(data.error || ADMIN_VIEW_TEXT.UPDATES.LOAD_FAILED);
      }

      setAvailableUpdates(data.updates);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : ADMIN_VIEW_TEXT.UPDATES.LOAD_FAILED;
      setError(message);
    } finally {
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  }, [runBlockingFetch]);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

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
      const res = await runBlockingFetch(
        API_PATHS.ADMIN.UPDATES,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName, ...(force && { force: true }) }),
        },
        { label: ADMIN_VIEW_TEXT.UPDATES.RUNNING_LABEL(fileName), cancellable: true }
      );

      const data = (await res.json()) as {
        error?: string;
        result?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(data.error || ADMIN_VIEW_TEXT.UPDATES.RUN_FAILED);
      }

      setLastResult(data.result?.message || ADMIN_VIEW_TEXT.UPDATES.RUN_RESULT);
      setRerunChecked((prev) => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
      await loadUpdates(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : ADMIN_VIEW_TEXT.UPDATES.RUN_FAILED;
      setError(message);
    } finally {
      setRunningFileName(null);
    }
  }

  const hasUpdates = useMemo(() => availableUpdates.length > 0, [availableUpdates.length]);

  return (
    <section className="rounded border border-slate-300 bg-white shadow-sm" data-testid={ADMIN_VIEW_IDS.UPDATES.SECTION}>
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-semibold text-slate-700" data-testid={ADMIN_VIEW_IDS.UPDATES.HEADING}>{ADMIN_VIEW_TEXT.UPDATES.HEADING}</h2>
      </div>
      {error && <p className="px-5 pt-4 text-sm text-red-700" data-testid={ADMIN_VIEW_IDS.UPDATES.ERROR}>{error}</p>}
      {lastResult && <p className="px-5 pt-4 text-sm text-emerald-700" data-testid={ADMIN_VIEW_IDS.UPDATES.RESULT}>{lastResult}</p>}

      {/* Cards */}
      <div>
        {isLoading && <p className="px-5 py-4 text-sm text-slate-600" data-testid={ADMIN_VIEW_IDS.UPDATES.LOADING}>{GLOBAL.UI_TEXT.ADMIN.LOADING_UPDATES}</p>}
        {!isLoading && !hasUpdates && (
          <p className="px-5 py-4 text-sm text-slate-600" data-testid={ADMIN_VIEW_IDS.UPDATES.EMPTY}>{ADMIN_VIEW_TEXT.UPDATES.EMPTY}</p>
        )}
        {!isLoading &&
          availableUpdates.map((item) => (
            <div key={item.fileName} className="border-t border-slate-200 px-5 py-4 text-sm" data-testid={ADMIN_VIEW_IDS.UPDATES.ITEM(item.fileName)}>
              <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="font-medium text-slate-500">{ADMIN_VIEW_TEXT.UPDATES.FILE}</dt>
                <dd className="break-all text-slate-700">{item.fileName}</dd>
                <dt className="font-medium text-slate-500">{ADMIN_VIEW_TEXT.UPDATES.UPDATE_KEY}</dt>
                <dd className="break-all text-slate-600">{item.updateKey}</dd>
                <dt className="font-medium text-slate-500">{ADMIN_VIEW_TEXT.UPDATES.CREATED}</dt>
                <dd className="text-slate-600">{formatTimestamp(item.createdUnixTimestamp)}</dd>
                <dt className="font-medium text-slate-500">{ADMIN_VIEW_TEXT.UPDATES.EXECUTED}</dt>
                <dd className="text-slate-600">
                  {item.hasBeenExecuted
                    ? `${ADMIN_VIEW_TEXT.UPDATES.YES} (${item.beenExecutedTimestamp ? new Date(item.beenExecutedTimestamp).toLocaleString() : ADMIN_VIEW_TEXT.UPDATES.UNKNOWN_TIME})`
                    : ADMIN_VIEW_TEXT.UPDATES.NO}
                </dd>
              </dl>
              <div className="flex flex-col gap-2">
                {item.hasBeenExecuted && (
                  <label className="flex items-center gap-2 text-xs text-slate-500 select-none">
                    <input
                      type="checkbox"
                      checked={rerunChecked.has(item.fileName)}
                      onChange={(e) => toggleRerun(item.fileName, e.target.checked)}
                      disabled={runningFileName === item.fileName}
                      className="accent-sky-700"
                      data-testid={ADMIN_VIEW_IDS.UPDATES.RERUN_CHECKBOX(item.fileName)}
                    />
                    {ADMIN_VIEW_TEXT.UPDATES.RUN_AGAIN}
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => void runUpdate(item.fileName, item.hasBeenExecuted)}
                  disabled={
                    runningFileName === item.fileName ||
                    (item.hasBeenExecuted && !rerunChecked.has(item.fileName))
                  }
                  className="self-start rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  data-testid={ADMIN_VIEW_IDS.UPDATES.RUN_BUTTON(item.fileName)}
                >
                  {runningFileName === item.fileName ? ADMIN_VIEW_TEXT.UPDATES.RUNNING : ADMIN_VIEW_TEXT.UPDATES.RUN_UPDATE}
                </button>
              </div>
            </div>
          ))}
      </div>

    </section>
  );
}
