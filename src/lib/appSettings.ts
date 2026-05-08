import { supabaseAdmin } from "./supabaseAdminClient";
import { cache } from "react";

const APP_SETTINGS_NAME = "app";
const APP_SETTINGS_TYPE = "App";

const DEFAULT_APP_NAME = "Todo App";

export type AppSettings = {
  appName: string;
};

/**
 * Reads the app settings from the Settings table.
 * Falls back to hardcoded default if no row is found or on error.
 * No caching — settings apply immediately after admin changes on next app startup.
 */
async function loadAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabaseAdmin
    .from("Settings")
    .select("settings")
    .eq("name", APP_SETTINGS_NAME)
    .eq("type", APP_SETTINGS_TYPE)
    .maybeSingle();

  if (error) {
    console.error("Failed to load app settings from Settings:", error.message);
    return { appName: DEFAULT_APP_NAME };
  }

  const settings = (data?.settings ?? {}) as Record<string, unknown>;

  const rawAppName = settings.appName;
  const appName =
    typeof rawAppName === "string" && rawAppName.trim()
      ? rawAppName.trim()
      : DEFAULT_APP_NAME;

  return { appName };
}

export const getAppSettings = cache(loadAppSettings);
