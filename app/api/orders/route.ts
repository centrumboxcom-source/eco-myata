import { dispatchNotifications } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { serviceClient, sessionClient } from "@/lib/server";
import { getSettings } from "@/lib/settings";
export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { message: "Перевірте контактні дані, адресу та склад кошика." },
      { status: 400 },
    );
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      {
        message:
          "Магазин у режимі перегляду. Приймання замовлень відкриється після підключення бази даних.",
      },
      { status: 503 },
    );
  const v = parsed.data;
  const settings = await getSettings();
  if (!settings.store_open)
    return NextResponse.json(
      { message: "Приймання замовлень ще не відкрито." },
      { status: 503 },
    );
  if (
    !(v.delivery === "locker" ? settings.np : settings[v.delivery]) ||
    !settings[v.payment]
  )
    return NextResponse.json(
      { message: "Цей спосіб оплати або доставки зараз недоступний." },
      { status: 400 },
    );
  if (
    (v.payment === "mono" && !process.env.MONOBANK_TOKEN) ||
    (v.payment === "liqpay" &&
      (!process.env.LIQPAY_PUBLIC_KEY || !process.env.LIQPAY_PRIVATE_KEY)) ||
    (v.payment === "bank" && !settings.iban)
  )
    return NextResponse.json(
      {
        message:
          "Цей спосіб оплати ще не налаштовано. Оберіть оплату при отриманні.",
      },
      { status: 400 },
    );
  const auth = await sessionClient();
  const user = auth ? (await auth.auth.getUser()).data.user : null;
  const { data, error } = await client.rpc("place_order", {
    p_payload: { ...v, user_id: user?.id || null },
  });
  if (error)
    return NextResponse.json(
      {
        message: error.message.includes("MINIMUM_ORDER")
          ? "Мінімальна сума замовлення — " +
            settings.commerce.minimum_order +
            " ₴ після знижки."
          : error.message.includes("CHECKOUT_FIELD")
            ? "Заповніть додаткові поля замовлення. Якщо форму змінено, оновіть сторінку."
            : error.message.includes("STOCK")
              ? "На жаль, кількість товару на складі змінилася. Оновіть кошик."
              : error.message.includes("PROMO")
                ? "Промокод недійсний або більше не доступний."
                : "Не вдалося оформити замовлення. Перевірте товари та спробуйте ще раз.",
      },
      { status: 400 },
    );
  const { data: stored, error: readError } = await client
    .from("orders")
    .select("items,discount,payment,payment_status")
    .eq("id", data.id)
    .single();
  if (readError)
    return NextResponse.json(
      { message: "Замовлення збережено. Повторіть запит для підтвердження." },
      { status: 503 },
    );
  await dispatchNotifications().catch(() => {});
  return NextResponse.json({
    id: data.id,
    total: data.total,
    items: stored.items,
    discount: stored.discount,
    payment_status: stored.payment_status,
    payment: stored.payment,
    iban: v.payment === "bank" ? settings.iban : null,
    recipient: v.payment === "bank" ? settings.recipient : null,
  });
}
