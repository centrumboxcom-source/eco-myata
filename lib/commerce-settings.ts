import { z } from "zod";
const label = z.string().trim().min(1).max(100);
export const extraFieldSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    label,
    type: z.enum(["text", "textarea", "select", "checkbox"]),
    required: z.boolean().default(false),
    options: z.array(label).max(20).default([]),
  })
  .refine(
    (f) => f.type !== "select" || f.options.length > 0,
    "Додайте варіанти списку",
  );
export const commerceSchema = z
  .object({
    sort: z.enum(["popular", "new", "asc", "desc"]).default("popular"),
    page_size: z.coerce
      .number()
      .refine((n) => [12, 24, 48].includes(n))
      .default(24),
    hide_unavailable: z.boolean().default(false),
    price_decimals: z.enum(["auto", "two"]).default("auto"),
    price_symbol: z.enum(["₴", "грн", "UAH"]).default("₴"),
    stock_label: label.default("Є в наявності"),
    soldout_label: label.default("Немає в наявності"),
    card_action: z.enum(["drawer", "continue", "product"]).default("drawer"),
    badge_position: z.enum(["left", "right"]).default("left"),
    show_badges: z.boolean().default(true),
    show_sku: z.boolean().default(true),
    minimum_order: z.coerce.number().min(0).max(1000000).default(0),
    comment_enabled: z.boolean().default(true),
    comment_label: label.default("Коментар до замовлення"),
    checkout_button: label.default("Підтвердити замовлення"),
    extra_fields: z.array(extraFieldSchema).max(8).default([]),
    working_hours: z.string().max(150).default("Пн–Пт · 9:00–18:00"),
    social_links: z
      .array(
        z.object({
          label,
          href: z
            .string()
            .max(500)
            .refine((v) => {
              try {
                const u = new URL(v);
                return u.protocol === "https:" && !u.username && !u.password;
              } catch {
                return false;
              }
            }, "Вкажіть HTTPS-посилання"),
          nofollow: z.boolean().default(false),
        }),
      )
      .max(10)
      .default([]),
  })
  .refine(
    (s) =>
      new Set(s.extra_fields.map((f) => f.id)).size === s.extra_fields.length,
    "Ідентифікатори полів мають бути унікальні",
  );
export type CommerceSettings = z.infer<typeof commerceSchema>;
export const defaultCommerce = commerceSchema.parse({});
export function formatPrice(amount: number, s: CommerceSettings) {
  return (
    new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: s.price_decimals === "two" ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount) +
    " " +
    s.price_symbol
  );
}
