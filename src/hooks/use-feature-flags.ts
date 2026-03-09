import { useLocalStorage } from "@uidotdev/usehooks";
import { useSettings } from "@/hooks/use-settings";

type FeatureFlags = {
  ontologyVersion: "v1" | "v2";
  graphClustering: boolean;
};

const FEATURE_FLAG_DEFAULTS: FeatureFlags = {
  ontologyVersion: "v1",
  graphClustering: false,
};

/**
 * Returns the current value of a single feature flag.
 * Merges server defaults → localStorage overrides.
 */
export function useFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
): FeatureFlags[K] {
  const { data: settings } = useSettings();
  const [localSettings] = useLocalStorage<Record<string, unknown>>(
    "app-settings",
    {},
  );

  // Server defaults
  const serverFlags = (settings?.formData?.featureFlags ??
    {}) as Partial<FeatureFlags>;

  // localStorage overrides (same shape as settings formData)
  const localFlags = ((localSettings as Record<string, Record<string, unknown>>)
    ?.featureFlags ?? {}) as Partial<FeatureFlags>;

  return localFlags[key] ?? serverFlags[key] ?? FEATURE_FLAG_DEFAULTS[key];
}
