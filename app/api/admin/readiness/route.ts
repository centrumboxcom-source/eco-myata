import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, safeError } from "@/lib/server";
import { getSettings, siteOrigin } from "@/lib/settings";
import { launchIssues } from "@/lib/store-settings";
import { merchantIssues } from "@/lib/merchant";
import { getProducts } from "@/lib/catalog";
export async function GET() {
  try {
    await requireAdmin();
    const s = await getSettings(),
      client = serviceClient();
    const { error } = client
      ? await client.from("products").select("merchant_enabled,gtin").limit(1)
      : { error: new Error() };
    const origin = siteOrigin(s);
    const products = (await getProducts()).filter((p) => p.merchant_enabled);
    const invalid = products
      .map((p) => ({ id: p.id, name: p.name, issues: merchantIssues(p) }))
      .filter((p) => p.issues.length);
    return NextResponse.json(
      {
        checks: [
          {
            name: "База та міграція 002",
            ok: !!client && !error,
            detail: error
              ? "Виконайте міграцію 002 та перевірте серверний ключ."
              : "З’єднання й поля інтеграції доступні.",
          },
          {
            name: "HTTPS-адреса",
            ok: origin.startsWith("https://"),
            detail: origin || "Задайте NEXT_PUBLIC_SITE_URL на хостингу.",
          },
          {
            name: "Дані продавця та умови",
            ok: !launchIssues(s).length,
            detail: launchIssues(s).join("; ") || "Заповнено.",
          },
          {
            name: "Приймання замовлень",
            ok: s.store_open,
            detail: s.store_open
              ? "Увімкнено."
              : "Увімкніть після перевірки каталогу та тестового замовлення.",
          },
          {
            name: "Індексація",
            ok: s.seo_visible,
            detail: s.seo_visible
              ? "Дозволена у налаштуваннях."
              : "SEO-видимість вимкнена.",
          },
          {
            name: "Google Merchant",
            ok: s.merchant_enabled && products.length > invalid.length,
            detail:
              "Експорт увімкнено для " +
              products.length +
              " товарів; помилок: " +
              invalid.length,
          },
          {
            name: "Аналітика",
            ok:
              s.analytics_mode !== "off" &&
              !!(s.analytics_mode === "ga4" ? s.ga4_id : s.gtm_id),
            detail:
              s.analytics_mode === "off"
                ? "Вимкнена."
                : s.analytics_mode.toUpperCase() +
                  " — перевірте події в Tag Assistant / DebugView.",
          },
          {
            name: "Нова пошта API",
            ok: !!process.env.NOVA_POSHTA_API_KEY,
            detail: process.env.NOVA_POSHTA_API_KEY
              ? "Ключ задано; перевірте реальний пошук."
              : "Без ключа доступне ручне введення адреси.",
          },
          {
            name: "Платежі",
            ok:
              (!s.mono || !!process.env.MONOBANK_TOKEN) &&
              (!s.liqpay ||
                !!(
                  process.env.LIQPAY_PUBLIC_KEY &&
                  process.env.LIQPAY_PRIVATE_KEY
                )),
            detail:
              "Онлайн-оплата потребує ключів, доступних callback-ів і тесту банку.",
          },
        ],
        products: invalid,
        feedCount: products.length - invalid.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const x = safeError(e);
    return NextResponse.json({ message: x.message }, { status: x.status });
  }
}
