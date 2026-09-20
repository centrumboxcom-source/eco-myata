import { NextResponse } from "next/server";
import { requireAdmin, safeError } from "@/lib/server";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const { client } = await requireAdmin();
    const p = z
      .object({
        ids: z.array(z.string().min(1).max(80)).min(1).max(500),
        changes: z
          .object({
            active: z.boolean().optional(),
            featured: z.boolean().optional(),
            category: z.string().min(1).optional(),
          })
          .refine((x) => Object.keys(x).length > 0),
      })
      .parse(await request.json());
    const { error } = await client
      .from("products")
      .update(p.changes)
      .in("id", p.ids);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const x = safeError(e);
    return NextResponse.json(
      {
        message:
          e instanceof z.ZodError
            ? "Перевірте вибрані товари та дію."
            : x.message,
      },
      { status: x.status },
    );
  }
}
