import { z } from "zod";
import { productExtras } from "./product-admin";
import { validGtin } from "./merchant";
export const checkoutSchema = z.object({
  custom_fields: z
    .record(z.string().max(40), z.string().max(1000))
    .refine((v) => Object.keys(v).length <= 8)
    .default({}),
  name: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^\+380\d{9}$/),
  email: z.email(),
  city: z.string().trim().min(2).max(150),
  address: z.string().trim().min(2).max(250),
  cityRef: z.string().max(50).optional(),
  warehouseRef: z.string().max(50).optional(),
  delivery: z.enum(["np", "locker", "ukr", "courier"]),
  payment: z.enum(["cod", "mono", "liqpay", "bank"]),
  comment: z.string().max(1000).optional(),
  promo: z.string().max(40).optional(),
  consent: z.literal(true),
  items: z
    .array(
      z.object({
        id: z.string().max(80),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(100),
  requestId: z.uuid(),
});
export const productSchema = z.object({
  ...productExtras.shape,
  id: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(160),
  category: z.string().min(1),
  price: z.coerce.number().positive().max(1000000),
  old_price: z.coerce.number().nonnegative().nullable().optional(),
  weight: z.string().max(40),
  stock: z.coerce.number().int().nonnegative().max(100000),
  tags: z.array(z.string().max(30)).max(10),
  image: z
    .string()
    .refine(
      (v) =>
        v.startsWith("/images/") ||
        /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(v),
      "Використайте завантажене фото",
    ),
  description: z.string().max(10000),
  ingredients: z.string().max(4000),
  nutrition: z.object({
    kcal: z.coerce.number().nonnegative(),
    protein: z.coerce.number().nonnegative(),
    fat: z.coerce.number().nonnegative(),
    carbs: z.coerce.number().nonnegative(),
  }),
  brand: z.string().max(100).default(""),
  gtin: z
    .string()
    .refine((v) => !v || validGtin(v), "Некоректний GTIN")
    .default(""),
  mpn: z.string().max(70).default(""),
  identifier_exists: z.boolean().default(true),
  google_category: z.string().max(200).default(""),
  merchant_enabled: z.boolean().default(false),
  additional_images: z
    .array(
      z
        .string()
        .refine(
          (v) =>
            v.startsWith("/images/") ||
            /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(v),
          "Використайте фото зі Storage",
        ),
    )
    .max(10)
    .default([]),
  featured: z.boolean(),
  active: z.boolean().default(true),
});
