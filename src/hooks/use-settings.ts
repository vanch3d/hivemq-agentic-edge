import { queryOptions, useQuery } from "@tanstack/react-query";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

interface SettingsResponse {
  schema: RJSFSchema;
  uiSchema: UiSchema;
  formData: Record<string, unknown>;
}

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json() as Promise<SettingsResponse>;
}

export const settingsOptions = () =>
  queryOptions({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

export function useSettings() {
  return useQuery(settingsOptions());
}
