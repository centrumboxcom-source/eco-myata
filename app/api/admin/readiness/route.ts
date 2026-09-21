import { integrationSecrets } from "@/lib/integration-secrets";
import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, safeError } from "@/lib/server";
import { getSettings, siteOrigin } from "@/lib/settings";
import { launchIssues } from "@/lib/store-settings";
import { merchantIssues } from "@/lib/merchant";
import { getProducts } from "@/lib/catalog";
export async function GET() {
  try {
    await requireAdmin();
    const keys = await integrationSecrets([
      "NOVA_POSHTA_API_KEY",
      "MONOBANK_TOKEN",
      "LIQPAY_PUBLIC_KEY",
      "LIQPAY_PRIVATE_KEY",
    ]);
    const s = await getSettings(),
      client = serviceClient();
    const { error } = client
      ? await client
          .from("products")
          .select("merchant_enabled,gtin,sku,track_stock")
          .limit(1)
      : { error: new Error() };
    const commerceCheck = client
      ? await client.from("orders").select("custom_fields").limit(1)
      : { error: true };
    const notificationCheck = client
      ? await client.from("order_notifications").select("id").limit(1)
      : { error: true };
    const secretsCheck = client
      ? await client.from("integration_secrets").select("id").limit(1)
      : { error: true };
    const origin = siteOrigin(s);
    const products = (await getProducts()).filter((p) => p.merchant_enabled);
    const invalid = products
      .map((p) => ({ id: p.id, name: p.name, issues: merchantIssues(p) }))
      .filter((p) => p.issues.length);
    return NextResponse.json(
      {
        checks: [
          {
            name: "Сховище ключів (006)",
            ok: !secretsCheck.error,
            detail:
              "Міграція 006 потрібна для введення токенів через адмінку. Ключ шифрування налаштовується на хостингу.",
          },
          {
            name: "Налаштування кошика та сповіщення (004–005)",
            ok: !commerceCheck.error && !notificationCheck.error,
            detail: "Для оновленої бази виконайте міграції 004 та 005.",
          },
          {
            name: "База та міграція 003",
            ok: !!client && !error,
            detail: error
              ? "Виконайте міграцію 003 та перевірте серверний ключ."
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
            ok: !!keys.NOVA_POSHTA_API_KEY,
            detail: keys.NOVA_POSHTA_API_KEY
              ? "Ключ задано; перевірте реальний пошук."
              : "Без ключа доступне ручне введення адреси.",
          },
          {
            name: "Платежі",
            ok:
              (!s.mono || !!keys.MONOBANK_TOKEN) &&
              (!s.liqpay ||
                !!(keys.LIQPAY_PUBLIC_KEY && keys.LIQPAY_PRIVATE_KEY)),
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
