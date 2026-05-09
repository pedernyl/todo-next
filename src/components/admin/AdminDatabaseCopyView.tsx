"use client";

import { useCallback, useEffect, useState } from "react";
import { useGlobalBlockingLoader } from "../../context/GlobalBlockingLoaderContext";

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
        "/api/admin/database-copy",
        { cache: "no-store" },
        { label: "Loading database copy status...", cancellable: true }
      );
      const data = (await res.json()) as AvailabilityResponse;

      if (!res.ok || typeof data.available !== "boolean") {
        throw new Error(data.error || "Failed to load database copy status");
      }

      setIsAvailable(data.available);
      setMissingVariables(data.missingVariables ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message =
        err instanceof Error ? err.message : "Failed to load database copy status";
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
        "/api/admin/database-copy",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: selectedMode }),
        },
        { label: "Copying production database to test database...", cancellable: false }
      );
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Database copy failed");
      }

      setSuccessMessage(data.message ?? "Database copy completed.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message = err instanceof Error ? err.message : "Database copy failed";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="space-y-4 rounded border border-slate-300 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-700">
          Copy production database to test database
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          This operation copies schema and data from production into the test database.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      {isLoading && <p className="text-sm text-slate-600">Loading database copy status...</p>}

      {!isLoading && !isAvailable && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>Database copy is disabled because required test database variables are missing.</p>
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
            Choose how to run the copy
          </legend>

          <label className="flex items-start gap-2 rounded border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="radio"
              name="copyMode"
              value="overwrite"
              checked={selectedMode === "overwrite"}
              onChange={() => setSelectedMode("overwrite")}
              className="mt-0.5 accent-sky-700"
            />
            <span>
              <span className="block font-semibold">Overwrite</span>
              <span className="text-xs text-slate-500">
                Truncate test database and copy all schema and data from production.
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
            />
            <span>
              <span className="block font-semibold">Append</span>
              <span className="text-xs text-slate-500">
                Keep existing test data and insert production rows where possible.
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
        >
          {isRunning ? "Copying..." : "Copy production to test"}
        </button>
      </div>
    </section>
  );
}
