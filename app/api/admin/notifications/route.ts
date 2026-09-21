import { integrationSecrets } from "@/lib/integration-secrets";
import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, safeError } from "@/lib/server";
import { dispatchNotifications } from "@/lib/notifications";
import { z } from "zod";
export async function GET() {
  try {
    const { client } = await requireAdmin();
    const keys = await integrationSecrets([
      "TELEGRAM_BOT_TOKEN",
      "RESEND_API_KEY",
    ]);
    const { data, error } = await client
      .from("order_notifications")
      .select(
        "id,order_id,channel,recipient,status,error,attempts,created_at,sent_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json(
      {
        jobs: data,
        configured: {
          telegram: !!keys.TELEGRAM_BOT_TOKEN,
          email: !!keys.RESEND_API_KEY,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const err = safeError(e);
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = z
      .object({
        id: z.uuid().optional(),
        confirm_uncertain: z.boolean().optional(),
      })
      .parse(await request.json());
    const db = serviceClient();
    if (!db) throw Error("База не підключена");
    if (input.id) {
      const states = input.confirm_uncertain
        ? ["failed", "uncertain"]
        : ["failed"];
      const { data, error } = await db
        .from("order_notifications")
        .update({ status: "pending", attempts: 0, error: "" })
        .eq("id", input.id)
        .in("status", states)
        .select("id");
      if (error) throw error;
      if (!data?.length)
        return NextResponse.json(
          {
            message:
              "Запис уже обробляється або потрібне підтвердження повтору.",
          },
          { status: 409 },
        );
    }
    return NextResponse.json(await dispatchNotifications());
  } catch (e) {
    const err = safeError(e);
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
}
