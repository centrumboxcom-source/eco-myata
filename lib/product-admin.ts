import { z } from "zod";
export const assetUrl = z
  .string()
  .refine(
    (v) =>
      v.startsWith("/images/") ||
      /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(v),
    "Використайте файл зі сховища магазину",
  );
export const productExtras = z.object({
  sku: z.string().trim().max(80).default(""),
  badge: z.string().trim().max(40).default(""),
  seo_title: z.string().trim().max(70).default(""),
  seo_description: z.string().trim().max(320).default(""),
  search_keywords: z.string().trim().max(255).default(""),
  noindex: z.boolean().default(false),
  category_ids: z.array(z.string().min(1).max(80)).max(20).default([]),
  attributes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(500),
      }),
    )
    .max(30)
    .default([]),
  attachments: z
    .array(z.object({ name: z.string().trim().min(1).max(120), url: assetUrl }))
    .max(10)
    .default([]),
  related_mode: z.enum(["auto", "manual", "off"]).default("auto"),
  related_ids: z.array(z.string().max(80)).max(12).default([]),
  related_category: z.string().max(80).default(""),
  related_limit: z.coerce.number().int().min(1).max(12).default(4),
  variant_group: z.string().trim().max(80).default(""),
  variant_label: z.string().trim().max(100).default(""),
  track_stock: z.boolean().default(true),
  available: z.boolean().default(true),
  internal_note: z.string().max(5000).default(""),
  tax_codes: z.string().max(255).default(""),
  updated_at: z.string().optional(),
});
export const categorySchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  name: z.string().trim().min(2).max(100),
  parent_id: z.string().nullable().default(null),
  sort_order: z.coerce.number().int().default(0),
  description: z.string().max(8000).default(""),
  image: z.union([z.literal(""), assetUrl]).default(""),
  seo_title: z.string().max(70).default(""),
  seo_description: z.string().max(320).default(""),
  noindex: z.boolean().default(false),
});
export type Category = z.infer<typeof categorySchema>;
export function slugify(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    є: "ye",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "yi",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ю: "yu",
    я: "ya",
  };
  return value
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[’'ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
}
export function categoryBranch(
  categories: { id: string; parent_id?: string | null }[],
  id: string,
): string[] {
  const ids = new Set([id]);
  for (let n = 0; n < categories.length; n++) {
    let changed = false;
    for (const c of categories)
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
    if (!changed) break;
  }
  return [...ids];
}
