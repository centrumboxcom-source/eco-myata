import { NextResponse } from "next/server";
import { requireAdmin, safeError } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const { client } = await requireAdmin();
    if (new URL(request.url).searchParams.get("subscribers") === "1") {
      const result: Record<string, unknown>[] = [];
      for (let i = 0; ; i += 1000) {
        const { data, error } = await client
          .from("subscribers")
          .select("email,created_at")
          .order("email")
          .range(i, i + 999);
        if (error) throw error;
        result.push(...data);
        if (data.length < 1000) break;
      }
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const rows = new Map<
      string,
      {
        email: string;
        name: string;
        phone: string;
        orders: number;
        total: number;
        last: string;
      }
    >();
    for (let i = 0; ; i += 1000) {
      const { data, error } = await client
        .from("orders")
        .select(
          "id,email,name,last_name,phone,total,status,payment_status,created_at",
        )
        .order("id")
        .range(i, i + 999);
      if (error) throw error;
      for (const o of data) {
        const key = o.email.toLowerCase(),
          old = rows.get(key),
          newer = !old || o.created_at > old.last;
        rows.set(key, {
          email: key,
          name: newer ? o.name + " " + o.last_name : old.name,
          phone: newer ? o.phone : old.phone,
          orders: (old?.orders || 0) + 1,
          total:
            (old?.total || 0) +
            (o.status !== "Скасовано" && o.payment_status !== "refunded"
              ? Number(o.total)
              : 0),
          last: newer ? o.created_at : old.last,
        });
      }
      if (data.length < 1000) break;
    }
    return NextResponse.json(
      [...rows.values()].sort((a, b) => b.last.localeCompare(a.last)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const x = safeError(e);
    return NextResponse.json({ message: x.message }, { status: x.status });
  }
}
