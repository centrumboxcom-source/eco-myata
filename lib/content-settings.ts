import { z } from "zod";
import { assetUrl } from "./product-admin";
export const safeLink = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) =>
      (/^\/(?!\/)/.test(v) && !v.includes("\\")) ||
      (/^https:\/\//.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    "Вкажіть /сторінку або https:// адресу",
  );
const link = z.object({ label: z.string().min(1).max(80), href: safeLink });
const banner = z.object({
  id: z.string().max(80),
  enabled: z.boolean(),
  eyebrow: z.string().max(120),
  title: z.string().min(1).max(200),
  text: z.string().max(1000),
  image: assetUrl,
  mobile_image: z.union([z.literal(""), assetUrl]).default(""),
  button: z.string().max(80),
  href: safeLink,
});
export const sectionNames = {
  benefits: "Переваги",
  categories: "Категорії",
  products: "Добірка товарів",
  promo: "Промоблок",
  about: "Про нас",
  blog: "Блог",
  community: "Відгуки та Instagram",
};
export const defaultHome = {
  banners: [
    {
      id: "main",
      enabled: true,
      eyebrow: "ВІД ПРИРОДИ. ДЛЯ ВАС.",
      title: "Природно\nбути собою.",
      text: "Корисні продукти з чистим складом.\nДля маленьких ритуалів і великої любові до себе.",
      image: "/images/hero.png",
      mobile_image: "",
      button: "Обрати своє корисне",
      href: "/catalog",
    },
  ],
  sections: Object.keys(sectionNames).map((id) => ({ id, enabled: true })),
  announcement: "Трохи природи у кожному дні",
  announcement_enabled: true,
  tagline: "КРАМНИЦЯ ПРИРОДНОЇ КОРИСТІ",
  navigation: [
    { label: "Новинки", href: "/catalog?sort=new" },
    { label: "Акційні пропозиції", href: "/catalog?sale=1" },
    { label: "Про нас", href: "/#about" },
    { label: "Блог", href: "/blog" },
    { label: "Оплата і доставка", href: "/delivery" },
  ],
  footer_links: [
    { label: "Контакти", href: "/contacts" },
    { label: "Оплата і доставка", href: "/delivery" },
    { label: "Повернення", href: "/returns" },
    { label: "Умови продажу", href: "/terms" },
    { label: "Конфіденційність", href: "/privacy" },
  ],
  benefits: [
    { title: "Чистий склад", text: "Без зайвого. Лише натуральне." },
    { title: "З турботою про природу", text: "Свідомий вибір кожного дня" },
    { title: "Доставка по Україні", text: "До вашого відділення чи додому" },
    { title: "Обираємо як для себе", text: "Перевіряємо кожен продукт" },
  ],
  categories_title: "Що вам до смаку?",
  products_title: "Маленькі фаворити. Велика користь.",
  product_ids: [] as string[],
  product_count: 4,
  promo: {
    id: "promo",
    enabled: true,
    eyebrow: "СМАЧНА ТУРБОТА ПРО СЕБЕ",
    title: "Хороший день\nпочинається з малого.",
    text: "Жменя горіхів. Чашка трав’яного чаю.\nХвилинка для себе. Знайдіть свій ритуал.",
    image: "/images/hero.png",
    mobile_image: "",
    button: "Додати затишку",
    href: "/catalog?category=tea",
  },
  about_title: "Ближче до природи.\nБлижче до себе.",
  about_text:
    "Ми віримо, що турбота про себе починається з простих речей. Із того, що ви кладете до своєї тарілки. З маленьких щоденних виборів.\n\nТому збираємо в одній крамниці натуральні продукти з прозорим складом — від добірних горіхів до ароматних трав’яних чаїв.",
  blog_title: "Корисне — це спосіб життя.",
  reviews_title: "Теплі слова про корисне.",
  instagram_title: "Більше природи у вашій стрічці.",
  newsletter_title: "Залишаймося на зв’язку",
  newsletter_text:
    "Новинки, смачні ідеї та приємні пропозиції — у вашій пошті.",
  newsletter_enabled: true,
};
export const homeSchema = z.object({
  banners: z.array(banner).min(1).max(6),
  sections: z
    .array(
      z.object({
        id: z.enum([
          "benefits",
          "categories",
          "products",
          "promo",
          "about",
          "blog",
          "community",
        ]),
        enabled: z.boolean(),
      }),
    )
    .max(7)
    .refine((a) => new Set(a.map((s) => s.id)).size === a.length),
  announcement: z.string().max(200),
  announcement_enabled: z.boolean(),
  tagline: z.string().max(100),
  navigation: z.array(link).max(8),
  footer_links: z.array(link).max(12),
  benefits: z
    .array(z.object({ title: z.string().max(100), text: z.string().max(200) }))
    .max(6),
  categories_title: z.string().max(150),
  products_title: z.string().max(150),
  product_ids: z.array(z.string().max(80)).max(20),
  product_count: z.coerce.number().int().min(1).max(20),
  promo: banner,
  about_title: z.string().max(200),
  about_text: z.string().max(10000),
  blog_title: z.string().max(150),
  reviews_title: z.string().max(150),
  instagram_title: z.string().max(150),
  newsletter_title: z.string().max(150),
  newsletter_text: z.string().max(400),
  newsletter_enabled: z.boolean(),
});
export type HomeContent = z.infer<typeof homeSchema>;
