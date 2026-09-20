import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.code !== "string" || !Array.isArray(body.items))
    return NextResponse.json({ message: "Вкажіть промокод." }, { status: 400 });
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { message: "Промокоди стануть доступні після відкриття магазину." },
      { status: 503 },
    );
  const { data, error } = await client.rpc("quote_cart", {
    p_items: body.items,
    p_code: body.code.trim().toUpperCase(),
  });
  if (error)
    return NextResponse.json(
      {
        message:
          "Промокод недійсний, прострочений або не підходить для цього кошика.",
      },
      { status: 400 },
    );
  return NextResponse.json(data);
}
