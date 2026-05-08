import { supabaseAdmin } from "./supabaseAdminClient";
import { cache } from "react";

const APP_SETTINGS_NAME = "app";
const APP_SETTINGS_TYPE = "App";
// TEMPORARY COMPATIBILITY FALLBACK. Remove in the next major release.
const LEGACY_TYPE_FALLBACK_FLAG = "[DEPRECATION][settings-type-legacy-fallback]";

const DEFAULT_APP_NAME = "Todo App";

export type AppSettings = {
  appName: string;
};

function getLegacyTypesFor(currentType: string): string[] {
  const candidates = [
    `${currentType.charAt(0).toLowerCase()}${currentType.slice(1)}`,
    currentType.toLowerCase(),
  ];

  return Array.from(new Set(candidates.filter((candidate) => candidate && candidate !== currentType)));
}

/**
 * Reads the app settings from the Settings table.
 * Falls back to hardcoded default if no row is found or on error.
 * Uses React cache() for per-request deduplication: multiple calls within a single request return memoized value.
 * Resets on every new request, so settings are always fresh when the page re-renders.
 * Changes made in admin immediately appear on next page load (no persistent cross-request caching).
 */
async function loadAppSettings(): Promise<AppSettings> {
  const { data: currentData, error: currentError } = await supabaseAdmin
    .from("Settings")
    .select("settings")
    .eq("name", APP_SETTINGS_NAME)
    .eq("type", APP_SETTINGS_TYPE)
    .maybeSingle();

  if (currentError) {
    console.error("Failed to load app settings from Settings:", currentError.message);
    return { appName: DEFAULT_APP_NAME };
  }

  if (currentData?.settings) {
    const settings = currentData.settings as Record<string, unknown>;
    const rawAppName = settings.appName;
    const appName =
      typeof rawAppName === "string" && rawAppName.trim()
        ? rawAppName.trim()
        : DEFAULT_APP_NAME;

    return { appName };
  }

  let settings: Record<string, unknown> | null = null;
  for (const legacyType of getLegacyTypesFor(APP_SETTINGS_TYPE)) {
    const { data: legacyData, error: legacyError } = await supabaseAdmin
      .from("Settings")
      .select("settings")
      .eq("name", APP_SETTINGS_NAME)
      .eq("type", legacyType)
      .maybeSingle();

    if (legacyError) {
      console.error("Failed to load legacy app settings from Settings:", legacyError.message);
      return { appName: DEFAULT_APP_NAME };
    }

    if (!legacyData?.settings) {
      continue;
    }

    console.warn(
      `${LEGACY_TYPE_FALLBACK_FLAG} Using legacy Settings.type=\"${legacyType}\" for ${APP_SETTINGS_NAME}. Run migration update and remove this fallback in the next major release.`
    );
    settings = legacyData.settings as Record<string, unknown>;
    break;
  }

  if (!settings) {
    return { appName: DEFAULT_APP_NAME };
  }

  const rawAppName = settings.appName;
  const appName =
    typeof rawAppName === "string" && rawAppName.trim()
      ? rawAppName.trim()
      : DEFAULT_APP_NAME;

  return { appName };
}

export const getAppSettings = cache(loadAppSettings);
