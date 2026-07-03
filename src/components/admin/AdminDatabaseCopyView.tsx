"use client";

import { useCallback, useEffect, useState } from "react";
import { API_PATHS } from "../../constants/api/apiPaths";
import { useGlobalBlockingLoader } from "../../context/GlobalBlockingLoaderContext";
import { GLOBAL } from "../../constants/global/global";
import { ADMIN_VIEW_IDS, ADMIN_VIEW_TEXT } from "../../constants/admin/adminViews";

type CopyMode = "overwrite" | "append";

type AvailabilityResponse = {
  available?: boolean;
  missingVariables?: string[];
  error?: string;
};

export default function AdminDatabaseCopyView() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<CopyMode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { runBlockingFetch } = useGlobalBlockingLoader();

  const loadAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await runBlockingFetch(
        API_PATHS.ADMIN.DATABASE_COPY,
        { cache: "no-store" },
        { label: GLOBAL.LOADER_LABELS.LOADING_DATABASE_COPY_STATUS, cancellable: true }
      );
      const data = (await res.json()) as AvailabilityResponse;

      if (!res.ok || typeof data.available !== "boolean") {
        throw new Error(data.error || ADMIN_VIEW_TEXT.DATABASE_COPY.LOAD_FAILED);
      }

      setIsAvailable(data.available);
      setMissingVariables(data.missingVariables ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message =
        err instanceof Error ? err.message : ADMIN_VIEW_TEXT.DATABASE_COPY.LOAD_FAILED;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [runBlockingFetch]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  async function runCopy() {
    if (!selectedMode || !isAvailable) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await runBlockingFetch(
        API_PATHS.ADMIN.DATABASE_COPY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: selectedMode }),
        },
        { label: GLOBAL.LOADER_LABELS.COPYING_DATABASE, cancellable: false }
      );
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || ADMIN_VIEW_TEXT.DATABASE_COPY.COPY_FAILED);
      }

      setSuccessMessage(data.message ?? ADMIN_VIEW_TEXT.DATABASE_COPY.COPY_COMPLETED);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message = err instanceof Error ? err.message : ADMIN_VIEW_TEXT.DATABASE_COPY.COPY_FAILED;
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="space-y-4 rounded border border-slate-300 bg-white p-5 shadow-sm" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.SECTION}>
      <div>
        <h2 className="text-lg font-semibold text-slate-700" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.HEADING}>{ADMIN_VIEW_TEXT.DATABASE_COPY.HEADING}</h2>
        <p className="mt-1 text-sm text-slate-600" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.DESCRIPTION}>{ADMIN_VIEW_TEXT.DATABASE_COPY.DESCRIPTION}</p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.ERROR}>
          {error}
        </p>
      )}
      {successMessage && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.SUCCESS}>
          {successMessage}
        </p>
      )}

      {isLoading && <p className="text-sm text-slate-600" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.LOADING}>{GLOBAL.UI_TEXT.ADMIN.LOADING_DATABASE_COPY}</p>}

      {!isLoading && !isAvailable && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.WARNING}>
          <p>{ADMIN_VIEW_TEXT.DATABASE_COPY.DISABLED_MESSAGE}</p>
          {missingVariables.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {missingVariables.map((variable) => (
                <li key={variable}>{variable}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isLoading && isAvailable && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-700">
            {ADMIN_VIEW_TEXT.DATABASE_COPY.MODE_LEGEND}
          </legend>

          <label className="flex items-start gap-2 rounded border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="radio"
              name="copyMode"
              value="overwrite"
              checked={selectedMode === "overwrite"}
              onChange={() => setSelectedMode("overwrite")}
              className="mt-0.5 accent-sky-700"
              data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.MODE_OVERWRITE}
            />
            <span>
              <span className="block font-semibold">{ADMIN_VIEW_TEXT.DATABASE_COPY.OVERWRITE}</span>
              <span className="text-xs text-slate-500">
                {ADMIN_VIEW_TEXT.DATABASE_COPY.OVERWRITE_DESCRIPTION}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="radio"
              name="copyMode"
              value="append"
              checked={selectedMode === "append"}
              onChange={() => setSelectedMode("append")}
              className="mt-0.5 accent-sky-700"
              data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.MODE_APPEND}
            />
            <span>
              <span className="block font-semibold">{ADMIN_VIEW_TEXT.DATABASE_COPY.APPEND}</span>
              <span className="text-xs text-slate-500">
                {ADMIN_VIEW_TEXT.DATABASE_COPY.APPEND_DESCRIPTION}
              </span>
            </span>
          </label>
        </fieldset>
      )}

      <div>
        <button
          type="button"
          onClick={() => void runCopy()}
          disabled={!isAvailable || !selectedMode || isRunning}
          className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          data-testid={ADMIN_VIEW_IDS.DATABASE_COPY.RUN_BUTTON}
        >
          {isRunning ? ADMIN_VIEW_TEXT.DATABASE_COPY.COPYING : ADMIN_VIEW_TEXT.DATABASE_COPY.RUN_COPY}
        </button>
      </div>
    </section>
  );
}
