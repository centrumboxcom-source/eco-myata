import type { MetadataRoute } from "next";
import { getSettings, siteOrigin } from "@/lib/settings";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  return {
    rules: {
      userAgent: "*",
      allow: s.seo_visible && s.store_open ? "/" : undefined,
      disallow:
        s.seo_visible && s.store_open
          ? ["/admin", "/account", "/checkout", "/api"]
          : ["/"],
    },
    sitemap: siteOrigin(s) + "/sitemap.xml",
  };
}
