import { z } from "zod";
const email = z.union([z.literal(""), z.email()]);
export const notificationSchema = z
  .object({
    telegram_enabled: z.boolean().default(false),
    telegram_chat_id: z
      .string()
      .regex(/^(-?\d{1,20})?$/)
      .default(""),
    staff_email_enabled: z.boolean().default(false),
    staff_email: email.default(""),
    customer_email_enabled: z.boolean().default(false),
    sender_email: email.default(""),
    email_heading: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .default("Дякуємо за замовлення!"),
    email_footer: z
      .string()
      .max(1000)
      .default("Ми зв’яжемося з вами для підтвердження деталей."),
  })
  .superRefine((s, ctx) => {
    if (s.telegram_enabled && !s.telegram_chat_id)
      ctx.addIssue({ code: "custom", message: "Вкажіть Telegram chat ID" });
    if ((s.staff_email_enabled || s.customer_email_enabled) && !s.sender_email)
      ctx.addIssue({ code: "custom", message: "Вкажіть адресу відправника" });
    if (s.staff_email_enabled && !s.staff_email)
      ctx.addIssue({ code: "custom", message: "Вкажіть email адміністратора" });
  });
export const defaultNotifications = notificationSchema.parse({});
