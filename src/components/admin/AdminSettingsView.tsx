"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalBlockingLoader } from "../../context/GlobalBlockingLoaderContext";
import type { AdminSettingsGroupState, AdminSettingsTypeGroup } from "../../lib/adminSettings";

function settingKey(setting: Pick<AdminSettingsGroupState, "name" | "type">): string {
  return `${setting.type}::${setting.name}`;
}

function formatChangedTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Never";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function cloneGroups(groups: AdminSettingsTypeGroup[]): AdminSettingsTypeGroup[] {
  return groups.map((group) => ({
    ...group,
    settings: group.settings.map((setting) => ({ ...setting, values: { ...setting.values } })),
  }));
}

export default function AdminSettingsView() {
  const [groups, setGroups] = useState<AdminSettingsTypeGroup[]>([]);
  const [draftBySettingKey, setDraftBySettingKey] = useState<Record<string, Record<string, unknown>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);
  const { runBlockingFetch } = useGlobalBlockingLoader();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await runBlockingFetch(
        "/api/admin/settings",
        { cache: "no-store" },
        { label: "Loading admin settings...", cancellable: true }
      );

      const data = (await res.json()) as { groups?: AdminSettingsTypeGroup[]; error?: string };

      if (!res.ok || !data.groups) {
        throw new Error(data.error || "Failed to load settings");
      }

      const clonedGroups = cloneGroups(data.groups);
      setGroups(clonedGroups);

      const nextDrafts: Record<string, Record<string, unknown>> = {};
      for (const typeGroup of clonedGroups) {
        for (const setting of typeGroup.settings) {
          nextDrafts[settingKey(setting)] = { ...setting.values };
        }
      }
      setDraftBySettingKey(nextDrafts);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load settings";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [runBlockingFetch]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const hasSettings = useMemo(
    () => groups.some((group) => group.settings.length > 0),
    [groups]
  );

  function updateDraft(setting: AdminSettingsGroupState, fieldKey: string, value: unknown) {
    const key = settingKey(setting);
    setSuccessMessage(null);
    setDraftBySettingKey((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? setting.values),
        [fieldKey]: value,
      },
    }));
  }

  function isSettingDirty(setting: AdminSettingsGroupState): boolean {
    const key = settingKey(setting);
    const draft = draftBySettingKey[key] ?? setting.values;

    return setting.fields.some((field) => draft[field.key] !== setting.values[field.key]);
  }

  async function saveSetting(setting: AdminSettingsGroupState) {
    const key = settingKey(setting);
    const draft = draftBySettingKey[key] ?? setting.values;

    setSavingSettingKey(key);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await runBlockingFetch(
        "/api/admin/settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: setting.name,
            type: setting.type,
            settings: draft,
          }),
        },
        { label: `Saving ${setting.title} settings...`, cancellable: true }
      );

      const data = (await res.json()) as { setting?: AdminSettingsGroupState; error?: string };

      const savedSetting = data.setting;

      if (!res.ok || !savedSetting) {
        throw new Error(data.error || "Failed to save setting");
      }

      setGroups((prev) =>
        prev.map((typeGroup) => ({
          ...typeGroup,
          settings: typeGroup.settings.map((current) =>
            current.name === savedSetting.name && current.type === savedSetting.type
              ? { ...current, ...savedSetting, values: { ...savedSetting.values } }
              : current
          ),
        }))
      );

      setDraftBySettingKey((prev) => ({
        ...prev,
        [key]: { ...savedSetting.values },
      }));

      setSuccessMessage(`Saved ${savedSetting.title}.`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to save setting";
      setError(message);
    } finally {
      setSavingSettingKey(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded border border-slate-300 bg-white px-5 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">Settings</h2>
        <p className="text-sm text-slate-600">Settings are defined by YAML schemas and saved manually per group.</p>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successMessage && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p>
      )}

      {isLoading && <p className="text-sm text-slate-600">Loading settings...</p>}
      {!isLoading && !hasSettings && (
        <p className="rounded border border-slate-300 bg-white px-5 py-4 text-sm text-slate-600">No settings definitions found.</p>
      )}

      {!isLoading &&
        groups.map((typeGroup) => (
          <section key={typeGroup.type} className="rounded border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3">
              <h3 className="text-base font-semibold text-slate-700">{typeGroup.type}</h3>
            </div>

            <div className="space-y-4 px-5 py-4">
              {typeGroup.settings.map((setting) => {
                const key = settingKey(setting);
                const draft = draftBySettingKey[key] ?? setting.values;
                const dirty = isSettingDirty(setting);

                return (
                  <article key={key} className="rounded border border-slate-200 p-4">
                    <header className="mb-3">
                      <h4 className="text-sm font-semibold text-slate-800">{setting.title}</h4>
                      {setting.description && <p className="mt-1 text-xs text-slate-600">{setting.description}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        Last changed: {formatChangedTimestamp(setting.changedTimestamp)}
                        {setting.changedBy ? ` (user #${setting.changedBy})` : ""}
                      </p>
                    </header>

                    <div className="space-y-3">
                      {setting.fields.map((field) => {
                        const fieldId = `${key}--${field.key}`;
                        const value = draft[field.key];

                        return (
                          <div key={field.key} className="space-y-1">
                            <label htmlFor={fieldId} className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                              {field.label}
                            </label>
                            {field.type === "textarea" && (
                              <textarea
                                id={fieldId}
                                value={typeof value === "string" ? value : ""}
                                placeholder={field.placeholder}
                                onChange={(event) => updateDraft(setting, field.key, event.target.value)}
                                className="min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                              />
                            )}
                            {field.type === "text" && (
                              <input
                                id={fieldId}
                                type="text"
                                value={typeof value === "string" ? value : ""}
                                placeholder={field.placeholder}
                                onChange={(event) => updateDraft(setting, field.key, event.target.value)}
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                              />
                            )}
                            {field.type === "number" && (
                              <input
                                id={fieldId}
                                type="number"
                                value={typeof value === "number" ? value : 0}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                onChange={(event) => {
                                  const nextValue = event.target.valueAsNumber;
                                  if (Number.isNaN(nextValue)) {
                                    return;
                                  }
                                  updateDraft(setting, field.key, nextValue);
                                }}
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                              />
                            )}
                            {field.type === "boolean" && (
                              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  id={fieldId}
                                  type="checkbox"
                                  checked={Boolean(value)}
                                  onChange={(event) => updateDraft(setting, field.key, event.target.checked)}
                                  className="accent-sky-700"
                                />
                                Enabled
                              </label>
                            )}
                            {field.type === "select" && (
                              <select
                                id={fieldId}
                                value={typeof value === "string" ? value : ""}
                                onChange={(event) => updateDraft(setting, field.key, event.target.value)}
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                              >
                                {(field.options ?? []).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => void saveSetting(setting)}
                        disabled={!dirty || savingSettingKey === key}
                        className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {savingSettingKey === key ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
    </section>
  );
}
