import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, serviceClient, safeError } from "@/lib/server";
import {
  integrationDefinitions,
  integrationIds,
} from "@/lib/integration-definitions";
import { encryptionKey, openSecret, sealSecret } from "@/lib/secret-crypto";
const headers = { "Cache-Control": "no-store" };
function failure(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("SECRET_CHANGED"))
    return NextResponse.json(
      {
        message:
          "Ключ уже змінено іншим адміністратором. Оновіть список перед повтором.",
      },
      { status: 409, headers },
    );
  if (msg === "ENCRYPTION_NOT_CONFIGURED")
    return NextResponse.json(
      {
        message: "Спочатку налаштуйте INTEGRATIONS_ENCRYPTION_KEY на сервері.",
      },
      { status: 503, headers },
    );
  const err = safeError(e);
  return NextResponse.json(
    { message: err.message },
    { status: err.status, headers },
  );
}
export async function GET() {
  try {
    await requireAdmin();
    const db = serviceClient();
    if (!db) throw Error("SUPABASE_NOT_CONFIGURED");
    let encryptionReady = false;
    try {
      encryptionKey(process.env.INTEGRATIONS_ENCRYPTION_KEY);
      encryptionReady = true;
    } catch {}
    const { data, error } = await db
      .from("integration_secrets")
      .select("id,version,updated_at,encrypted_value");
    if (error)
      return NextResponse.json(
        {
          message:
            "Не вдалося відкрити сховище. Виконайте міграцію 006 та перевірте серверний ключ Supabase.",
        },
        { status: 503, headers },
      );
    const { data: audit } = await db
      .from("integration_secret_audit")
      .select("id,integration_id,action,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    return NextResponse.json(
      {
        encryptionReady,
        items: integrationDefinitions.map((d) => {
          const row = data.find((v) => v.id === d.id);
          let readable = true;
          if (row)
            try {
              openSecret(
                d.id,
                row.encrypted_value,
                process.env.INTEGRATIONS_ENCRYPTION_KEY,
              );
            } catch {
              readable = false;
            }
          return {
            id: d.id,
            stored: !!row,
            environment: !!process.env[d.id],
            ready: row ? readable : !!process.env[d.id],
            readable,
            version: row?.version || null,
            updated_at: row?.updated_at || null,
          };
        }),
        audit: audit || [],
      },
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== new URL(request.url).origin)
    )
      return NextResponse.json(
        { message: "Недозволене джерело запиту." },
        { status: 403, headers },
      );
    const { user } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 12000)
      return NextResponse.json(
        { message: "Завеликий запит." },
        { status: 413, headers },
      );
    const parsed = z
      .object({
        id: z.enum(integrationIds),
        value: z
          .string()
          .trim()
          .min(8)
          .max(4096)
          .regex(/^[^\s]+$/)
          .optional(),
        remove: z.boolean().default(false),
        version: z.uuid().nullable(),
      })
      .safeParse(JSON.parse(raw));
    if (!parsed.success || (!parsed.data.remove && !parsed.data.value))
      return NextResponse.json(
        {
          message:
            "Перевірте значення ключа. Пробіли й переноси рядків не допускаються.",
        },
        { status: 400, headers },
      );
    const p = parsed.data,
      db = serviceClient();
    if (!db) throw Error("SUPABASE_NOT_CONFIGURED");
    const encrypted = p.remove
      ? null
      : sealSecret(p.id, p.value!, process.env.INTEGRATIONS_ENCRYPTION_KEY);
    const { error } = await db.rpc("write_integration_secret", {
      p_id: p.id,
      p_encrypted: encrypted,
      p_expected_version: p.version,
      p_actor: user.id,
    });
    if (error)
      throw Error(
        error.message.includes("SECRET_CHANGED")
          ? "SECRET_CHANGED"
          : "SECRET_SAVE_FAILED",
      );
    return NextResponse.json({ saved: true }, { headers });
  } catch (e) {
    return failure(e);
  }
}
