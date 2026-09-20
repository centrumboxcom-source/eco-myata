import { z } from "zod";
const text = (n: number) => z.string().trim().max(n).default("");
export const settingsSchema = z.object({
  site_url: z
    .union([
      z.literal(""),
      z
        .url()
        .refine((v) => {
          const u = new URL(v);
          return (
            u.protocol === "https:" &&
            !u.username &&
            !u.password &&
            u.pathname === "/" &&
            !u.search &&
            !u.hash
          );
        }, "Вкажіть HTTPS-домен без шляху")
        .transform((v) => new URL(v).origin),
    ])
    .default(""),
  name: z.string().trim().min(2).max(100).default("ЕКО М’ЯТА"),
  description: z.string().max(500).default("Крамниця природної користі"),
  email: z.union([z.literal(""), z.email()]).default(""),
  phone: text(40),
  instagram: z
    .union([
      z.literal(""),
      z.string().regex(/^https:\/\/(www\.)?instagram\.com\//),
    ])
    .default(""),
  iban: text(40),
  recipient: text(200),
  legal_name: text(250),
  tax_id: text(30),
  address: text(500),
  shipping_details: text(10000),
  returns_policy: text(15000),
  terms: text(20000),
  seo_visible: z.boolean().default(false),
  store_open: z.boolean().default(false),
  merchant_enabled: z.boolean().default(false),
  np: z.boolean().default(true),
  ukr: z.boolean().default(true),
  courier: z.boolean().default(true),
  cod: z.boolean().default(true),
  mono: z.boolean().default(false),
  liqpay: z.boolean().default(false),
  bank: z.boolean().default(false),
  free_shipping: z.coerce.number().nonnegative().max(1000000).default(1500),
  analytics_mode: z.enum(["off", "ga4", "gtm"]).default("off"),
  ga4_id: z
    .union([z.literal(""), z.string().regex(/^G-[A-Z0-9]+$/)])
    .default(""),
  gtm_id: z
    .union([z.literal(""), z.string().regex(/^GTM-[A-Z0-9]+$/)])
    .default(""),
  google_verification: z
    .string()
    .regex(/^[A-Za-z0-9_-]*$/)
    .max(200)
    .default(""),
});
export const defaultSettings = settingsSchema.parse({});
export type Settings = z.infer<typeof settingsSchema>;
export function launchIssues(s: Settings) {
  return [
    !s.site_url && "Публічний HTTPS-домен",
    !s.legal_name && "Назва продавця (ФОП або компанія)",
    !s.email && "Контактний email",
    !s.phone && "Телефон",
    !s.address && "Адреса для звернень",
    !s.shipping_details && "Умови й строки доставки",
    !s.returns_policy && "Умови повернення",
    !s.terms && "Умови продажу",
    !(s.np || s.ukr || s.courier) && "Спосіб доставки",
    !(s.cod || s.mono || s.liqpay || s.bank) && "Спосіб оплати",
    s.bank && (!s.iban || !s.recipient) && "IBAN та отримувач",
    s.analytics_mode === "ga4" && !s.ga4_id && "GA4 ID",
    s.analytics_mode === "gtm" && !s.gtm_id && "GTM ID",
  ].filter(Boolean) as string[];
}
