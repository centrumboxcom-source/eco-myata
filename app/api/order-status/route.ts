import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/server";
import { getSettings } from "@/lib/settings";
export async function POST(request: Request) {
  const p = z
    .object({ orderId: z.uuid(), requestId: z.uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ message: "Некоректний запит" }, { status: 400 });
  const db = serviceClient();
  if (!db)
    return NextResponse.json(
      { message: "Магазин не підключено" },
      { status: 503 },
    );
  const { data: o, error } = await db
    .from("orders")
    .select("id,total,discount,payment,payment_status,status,items")
    .eq("id", p.data.orderId)
    .eq("request_id", p.data.requestId)
    .maybeSingle();
  if (error || !o)
    return NextResponse.json(
      { message: "Замовлення не знайдено" },
      { status: 404 },
    );
  const s = await getSettings();
  return NextResponse.json(
    {
      ...o,
      iban: o.payment === "bank" ? s.iban : undefined,
      recipient: o.payment === "bank" ? s.recipient : undefined,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
