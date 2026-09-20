import { NextResponse } from "next/server";
import { requireAdmin, safeError } from "@/lib/server";
import { productSchema } from "@/lib/validation";
import { settingsSchema, launchIssues } from "@/lib/store-settings";
import { merchantIssues } from "@/lib/merchant";
import { z } from "zod";
const image = z
  .string()
  .refine(
    (v) =>
      v.startsWith("/images/") ||
      /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(v),
    "Використайте фото зі Storage",
  );
const schemas = {
  products: productSchema,
  categories: z.object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(80),
    name: z.string().min(2).max(100),
    parent_id: z.string().nullable().optional(),
    sort_order: z.coerce.number().int().optional(),
  }),
  promocodes: z
    .object({
      id: z.uuid().optional(),
      code: z
        .string()
        .trim()
        .min(2)
        .max(40)
        .transform((v) => v.toUpperCase()),
      type: z.enum(["percent", "fixed"]),
      value: z.coerce.number().positive(),
      active: z.boolean(),
      min_order: z.coerce.number().nonnegative(),
      max_uses: z.coerce.number().int().positive().nullable(),
      expires_at: z.iso.datetime().nullable(),
    })
    .refine(
      (p) => p.type !== "percent" || p.value <= 100,
      "Відсоток не може перевищувати 100",
    ),
  posts: z.object({
    id: z.uuid().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(3).max(200),
    excerpt: z.string().max(1000),
    content: z.string().max(50000),
    image,
    published: z.boolean(),
  }),
};
function errorResponse(e: unknown) {
  if (e instanceof z.ZodError)
    return NextResponse.json(
      {
        message: e.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      },
      { status: 400 },
    );
  const error = e as { message?: string; code?: string };
  const messages: Record<string, string> = {
    CATEGORY_CYCLE: "Категорії не можуть посилатися одна на одну по колу.",
    REFUND_REQUIRED:
      "Спочатку поверніть оплату в банку та зафіксуйте повернення.",
    PAYMENT_PENDING:
      "Рахунок ще очікує оплату. Спочатку анулюйте його у банку й дочекайтеся підтвердження.",
    CANCELLED_ORDER_CANNOT_REOPEN:
      "Скасоване замовлення не можна відновити. Створіть нове.",
    INVALID_PAYMENT_TRANSITION: "Ця зміна статусу оплати недоступна.",
  };
  const known = messages[error.message || ""];
  if (known) return NextResponse.json({ message: known }, { status: 409 });
  if (error.code === "23505")
    return NextResponse.json(
      { message: "Такий код або посилання вже існує." },
      { status: 409 },
    );
  if (error.code === "23503")
    return NextResponse.json(
      {
        message:
          "Запис використовується іншими даними. Спочатку змініть пов’язані записи.",
      },
      { status: 409 },
    );
  const x = safeError(e);
  return NextResponse.json({ message: x.message }, { status: x.status });
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    const { client } = await requireAdmin();
    const { resource } = await params;
    if (
      ![
        "products",
        "orders",
        "categories",
        "promocodes",
        "posts",
        "settings",
        "reviews",
      ].includes(resource)
    )
      return NextResponse.json({ message: "Не знайдено" }, { status: 404 });
    const page = Math.max(
      0,
      Number(new URL(request.url).searchParams.get("page")) || 0,
    );
    let query = client.from(resource).select("*");
    if (resource === "orders")
      query = query
        .order("created_at", { ascending: false })
        .range(page * 200, page * 200 + 199);
    else if (
      resource === "products" ||
      resource === "posts" ||
      resource === "reviews"
    )
      query = query.order("created_at", { ascending: false }).limit(1000);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    const { client } = await requireAdmin();
    const { resource } = await params;
    const body = await request.json();
    let record: unknown;
    if (resource === "orders") {
      const p = z
        .object({
          id: z.uuid(),
          status: z
            .enum(["Нове", "В обробці", "Відправлено", "Виконано", "Скасовано"])
            .optional(),
          payment_status: z.enum(["paid", "refunded"]).optional(),
          ttn: z.string().max(40).optional(),
        })
        .parse(body);
      const result = p.payment_status
        ? await client.rpc("set_manual_payment", {
            p_id: p.id,
            p_state: p.payment_status,
          })
        : await client.rpc("update_order_status", {
            p_id: p.id,
            p_status: p.status,
            p_ttn: p.ttn ?? null,
          });
      if (result.error) throw result.error;
      const { data, error } = await client
        .from("orders")
        .select("*")
        .eq("id", p.id)
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
    if (resource === "reviews") {
      record = z.object({ id: z.uuid(), approved: z.boolean() }).parse(body);
    } else if (resource === "settings") {
      const parsed = z
        .object({ id: z.literal("store"), value: settingsSchema })
        .parse(body);
      const s = parsed.value;
      const issues = launchIssues(s);
      if (s.store_open && issues.length)
        return NextResponse.json(
          { message: "Перед відкриттям заповніть: " + issues.join("; ") },
          { status: 400 },
        );
      if (
        s.store_open &&
        ((s.mono && !process.env.MONOBANK_TOKEN) ||
          (s.liqpay &&
            !(process.env.LIQPAY_PRIVATE_KEY && process.env.LIQPAY_PUBLIC_KEY)))
      )
        return NextResponse.json(
          { message: "Увімкнена онлайн-оплата не має ключів на сервері." },
          { status: 400 },
        );
      record = parsed;
    } else {
      const schema = schemas[resource as keyof typeof schemas];
      if (!schema)
        return NextResponse.json({ message: "Не знайдено" }, { status: 404 });
      record = schema.parse(body);
      if (resource === "products") {
        const p = record as z.infer<typeof productSchema>;
        if (p.merchant_enabled && merchantIssues(p).length)
          return NextResponse.json(
            { message: "Для Google виправте: " + merchantIssues(p).join("; ") },
            { status: 400 },
          );
      }
    }
    const { data, error } =
      resource === "reviews"
        ? await client
            .from(resource)
            .update({ approved: (record as { approved: boolean }).approved })
            .eq("id", (record as { id: string }).id)
            .select()
            .single()
        : await client
            .from(resource)
            .upsert(record as never)
            .select()
            .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    const { client } = await requireAdmin();
    const { resource } = await params;
    if (!["products", "categories", "promocodes", "posts"].includes(resource))
      return NextResponse.json({ message: "Дія недоступна" }, { status: 400 });
    const { id } = z
      .object({ id: z.string().min(1).max(80) })
      .parse(await request.json());
    const r =
      resource === "products"
        ? await client.from(resource).update({ active: false }).eq("id", id)
        : await client.from(resource).delete().eq("id", id);
    if (r.error) throw r.error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
