import { supabaseAdmin } from "./supabaseAdminClient";

const TODOS_SETTINGS_NAME = "todos";
const TODOS_SETTINGS_TYPE = "App";
// TEMPORARY COMPATIBILITY FALLBACK. Remove in the next major release.
const LEGACY_TYPE_FALLBACK_FLAG = "[DEPRECATION][settings-type-legacy-fallback]";

const DEFAULT_LOAD_LIMIT = 50;
const DEFAULT_MAX_LOAD_LIMIT = 200;

export type TodoLoadPolicy = {
  defaultLoadLimit: number;
  maxLoadLimit: number;
};

function getLegacyTypesFor(currentType: string): string[] {
  const candidates = [
    `${currentType.charAt(0).toLowerCase()}${currentType.slice(1)}`,
    currentType.toLowerCase(),
  ];

  return Array.from(new Set(candidates.filter((candidate) => candidate && candidate !== currentType)));
}

/**
 * Reads the todo load policy from the Settings table.
 * Falls back to hardcoded defaults if no row is found or on error.
 * No caching — settings apply immediately after admin changes.
 */
export async function getTodoLoadPolicy(): Promise<TodoLoadPolicy> {
  const { data: currentData, error: currentError } = await supabaseAdmin
    .from("Settings")
    .select("settings")
    .eq("name", TODOS_SETTINGS_NAME)
    .eq("type", TODOS_SETTINGS_TYPE)
    .maybeSingle();

  if (currentError) {
    console.error("Failed to load todo load policy from Settings:", currentError.message);
    return { defaultLoadLimit: DEFAULT_LOAD_LIMIT, maxLoadLimit: DEFAULT_MAX_LOAD_LIMIT };
  }

  let settings = (currentData?.settings ?? {}) as Record<string, unknown>;

  if (!currentData?.settings) {
    for (const legacyType of getLegacyTypesFor(TODOS_SETTINGS_TYPE)) {
      const { data: legacyData, error: legacyError } = await supabaseAdmin
        .from("Settings")
        .select("settings")
        .eq("name", TODOS_SETTINGS_NAME)
        .eq("type", legacyType)
        .maybeSingle();

      if (legacyError) {
        console.error("Failed to load legacy todo load policy from Settings:", legacyError.message);
        return { defaultLoadLimit: DEFAULT_LOAD_LIMIT, maxLoadLimit: DEFAULT_MAX_LOAD_LIMIT };
      }

      if (!legacyData?.settings) {
        continue;
      }

      console.warn(
        `${LEGACY_TYPE_FALLBACK_FLAG} Using legacy Settings.type=\"${legacyType}\" for ${TODOS_SETTINGS_NAME}. Run migration update and remove this fallback in the next major release.`
      );
      settings = legacyData.settings as Record<string, unknown>;
      break;
    }
  }

  const rawDefault = settings.defaultLoadLimit;
  const defaultLoadLimit =
    typeof rawDefault === "number" && Number.isFinite(rawDefault) && rawDefault >= 1
      ? rawDefault
      : DEFAULT_LOAD_LIMIT;

  const rawMax = settings.maxLoadLimit;
  const maxLoadLimit =
    typeof rawMax === "number" && Number.isFinite(rawMax) && rawMax >= 1
      ? rawMax
      : DEFAULT_MAX_LOAD_LIMIT;

  return { defaultLoadLimit, maxLoadLimit };
}

/**
 * Computes the effective query limit from the policy and an optional client-requested value.
 *
 * - If requestedLimit is provided and valid, it is clamped to [1, maxLoadLimit].
 * - If not provided (or invalid), defaultLoadLimit is used (also clamped to [1, maxLoadLimit]).
 *
 * Structured so that an allowUserOverride toggle can easily be added in the future:
 * simply gate the requestedLimit branch on that boolean when it is introduced.
 */
export function computeEffectiveLimit(
  policy: TodoLoadPolicy,
  requestedLimit?: number | null
): number {
  const safeMax = Math.max(policy.maxLoadLimit, 1);

  if (requestedLimit != null && Number.isFinite(requestedLimit)) {
    return Math.min(Math.max(Math.floor(requestedLimit), 1), safeMax);
  }

  return Math.min(Math.max(policy.defaultLoadLimit, 1), safeMax);
}
