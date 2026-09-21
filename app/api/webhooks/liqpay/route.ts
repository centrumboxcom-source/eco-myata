import { integrationSecrets } from "@/lib/integration-secrets";
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/server";
export async function POST(request: Request) {
  const keys = await integrationSecrets([
    "LIQPAY_PRIVATE_KEY",
    "LIQPAY_PUBLIC_KEY",
  ]);
  const client = serviceClient(),
    key = keys.LIQPAY_PRIVATE_KEY;
  if (!client || !key) return new NextResponse(null, { status: 503 });
  const raw = await request.text();
  if (raw.length > 65536) return new NextResponse(null, { status: 413 });
  const form = new URLSearchParams(raw),
    data = form.get("data"),
    signature = form.get("signature");
  if (!data || !signature) return new NextResponse(null, { status: 400 });
  const expected = createHash("sha3-256")
    .update(key + data + key)
    .digest();
  const provided = Buffer.from(signature, "base64");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(expected, provided)
  )
    return new NextResponse(null, { status: 401 });
  try {
    const d = JSON.parse(Buffer.from(data, "base64").toString());
    const { data: o } = await client
      .from("orders")
      .select("id,total,payment,payment_status")
      .eq("id", d.order_id)
      .single();
    if (
      !o ||
      o.payment !== "liqpay" ||
      d.public_key !== keys.LIQPAY_PUBLIC_KEY ||
      d.currency !== "UAH" ||
      Number(d.amount) !== Number(o.total)
    )
      return new NextResponse(null, { status: 400 });
    if (d.status === "success" && o.payment_status !== "paid") {
      const { error } = await client.rpc("record_payment", {
        p_id: o.id,
        p_state: "paid",
      });
      if (error) return new NextResponse(null, { status: 503 });
    }
    if (
      ["failure", "error", "expired"].includes(d.status) &&
      o.payment_status !== "paid"
    ) {
      const { error } = await client.rpc("record_payment", {
        p_id: o.id,
        p_state: "failed",
      });
      if (error) return new NextResponse(null, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
