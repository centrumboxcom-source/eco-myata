import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { getSettings, siteOrigin } from "@/lib/settings";
import { getPosts } from "@/lib/posts";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin(await getSettings());
  const [products, posts] = await Promise.all([getProducts(), getPosts()]);
  return [
    ...[
      "",
      "/catalog",
      "/blog",
      "/delivery",
      "/contacts",
      "/privacy",
      "/returns",
      "/terms",
    ].map((p) => ({
      url: origin + p,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...products.map((p) => ({
      url: origin + "/product/" + p.slug,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: origin + "/blog/" + p.slug,
      lastModified: new Date(p.created_at),
      priority: 0.6,
    })),
  ];
}
