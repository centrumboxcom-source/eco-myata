import { NextResponse } from "next/server";
import { requireAdmin, safeError } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const { client } = await requireAdmin();
    const days = Number(new URL(request.url).searchParams.get("days") || 30);
    if (![1, 7, 30].includes(days))
      return NextResponse.json(
        { message: "Некоректний період" },
        { status: 400 },
      );
    const { data, error } = await client.rpc("dashboard_stats", {
      p_days: days,
    });
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const x = safeError(e);
    return NextResponse.json({ message: x.message }, { status: x.status });
  }
}
