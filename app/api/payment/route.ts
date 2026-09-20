import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { serviceClient } from "@/lib/server";
import { z } from "zod";
import { getSettings, siteOrigin } from "@/lib/settings";
export async function POST(request: Request) {
  const v = z
    .object({ orderId: z.uuid(), requestId: z.uuid() })
    .safeParse(await request.json().catch(() => null));
  const client = serviceClient();
  if (!v.success || !client)
    return NextResponse.json(
      { message: "Оплату не налаштовано." },
      { status: 400 },
    );
  const { data: o } = await client
    .from("orders")
    .select("*")
    .eq("id", v.data.orderId)
    .eq("request_id", v.data.requestId)
    .single();
  if (
    !o ||
    o.status === "Скасовано" ||
    ["paid", "refunded"].includes(o.payment_status)
  )
    return NextResponse.json(
      { message: "Замовлення недоступне для оплати." },
      { status: 400 },
    );
  const origin = siteOrigin(await getSettings());
  if (!origin?.startsWith("https://"))
    return NextResponse.json(
      { message: "Онлайн-оплата потребує HTTPS-сайту." },
      { status: 503 },
    );
  try {
    if (o.payment === "mono" && process.env.MONOBANK_TOKEN) {
      if (o.payment_url) return NextResponse.json({ url: o.payment_url });
      const { data: claimed, error: claimError } = await client.rpc(
        "claim_payment_attempt",
        { p_id: o.id },
      );
      if (claimError || !claimed)
        return NextResponse.json(
          {
            message:
              "Рахунок уже створюється або потребує звірки з банком. Спробуйте за хвилину; якщо помилка повторюється, зверніться до магазину.",
          },
          { status: 409 },
        );
      const r = await fetch(
        "https://api.monobank.ua/api/merchant/invoice/create",
        {
          method: "POST",
          headers: {
            "X-Token": process.env.MONOBANK_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(Number(o.total) * 100),
            ccy: 980,
            merchantPaymInfo: {
              reference: o.id,
              destination: "Замовлення №" + o.id.slice(0, 8),
            },
            redirectUrl: origin + "/payment/result",
            webHookUrl: origin + "/api/webhooks/mono",
            validity: 86400,
            paymentType: "debit",
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.pageUrl || !d.invoiceId) throw new Error();
      if (new URL(d.pageUrl).protocol !== "https:") throw new Error();
      const { error } = await client
        .from("orders")
        .update({ invoice_id: d.invoiceId, payment_url: d.pageUrl })
        .eq("id", o.id);
      if (error) throw error;
      return NextResponse.json({ url: d.pageUrl });
    }
    if (
      o.payment === "liqpay" &&
      process.env.LIQPAY_PUBLIC_KEY &&
      process.env.LIQPAY_PRIVATE_KEY
    ) {
      if (!o.payment_started_at) {
        const { data: claimed, error } = await client.rpc(
          "claim_payment_attempt",
          { p_id: o.id },
        );
        if (error || !claimed)
          return NextResponse.json(
            { message: "Рахунок уже створюється. Повторіть за хвилину." },
            { status: 409 },
          );
      }
      const data = Buffer.from(
        JSON.stringify({
          version: 7,
          public_key: process.env.LIQPAY_PUBLIC_KEY,
          action: "pay",
          amount: Number(o.total),
          currency: "UAH",
          description: "Замовлення №" + o.id.slice(0, 8),
          order_id: o.id,
          result_url: origin + "/payment/result",
          server_url: origin + "/api/webhooks/liqpay",
          language: "uk",
        }),
      ).toString("base64");
      const signature = createHash("sha3-256")
        .update(
          process.env.LIQPAY_PRIVATE_KEY +
            data +
            process.env.LIQPAY_PRIVATE_KEY,
        )
        .digest("base64");
      return NextResponse.json({ provider: "liqpay", data, signature });
    }
    return NextResponse.json(
      { message: "Оберіть доступний спосіб оплати." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Не вдалося підтвердити створення рахунку. Замовлення збережено. Зверніться до магазину для звірки, перш ніж повторювати оплату.",
      },
      { status: 502 },
    );
  }
}
