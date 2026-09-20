import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/server";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!z.email().safeParse(body?.email).success)
    return NextResponse.json(
      { message: "Перевірте адресу електронної пошти." },
      { status: 400 },
    );
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { message: "Підписка відкриється разом із запуском магазину." },
      { status: 503 },
    );
  const { error } = await client
    .from("subscribers")
    .upsert(
      { email: body.email.toLowerCase() },
      { onConflict: "email", ignoreDuplicates: true },
    );
  return NextResponse.json(
    {
      message: error
        ? "Не вдалося оформити підписку. Спробуйте пізніше."
        : "Ви підписалися! Дякуємо, що ви з нами 🌿",
    },
    { status: error ? 400 : 200 },
  );
}
