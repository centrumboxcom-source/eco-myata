import { cache } from "react";
import { serviceClient } from "./server";
export { defaultSettings, type Settings } from "./store-settings";
import {
  defaultSettings,
  settingsSchema,
  type Settings,
} from "./store-settings";
export const getSettings = cache(async (): Promise<Settings> => {
  const client = serviceClient();
  if (!client) return defaultSettings;
  const { data, error } = await client
    .from("settings")
    .select("value")
    .eq("id", "store")
    .maybeSingle();
  if (error) throw error;
  return settingsSchema.parse({ ...defaultSettings, ...data?.value });
});

export function siteOrigin(s: Settings) {
  return (
    s.site_url || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  );
}
