import { getProducts } from "@/lib/catalog";
import { getSettings, siteOrigin } from "@/lib/settings";
import { launchIssues } from "@/lib/store-settings";
import { serviceClient } from "@/lib/server";
import { merchantXml } from "@/lib/merchant";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSettings();
  const origin = siteOrigin(s);
  if (
    !serviceClient() ||
    !s.store_open ||
    !s.merchant_enabled ||
    !s.seo_visible ||
    launchIssues(s).length ||
    !origin?.startsWith("https://")
  )
    return new Response(
      "Товарний фід ще не увімкнено. Перевірте готовність магазину в адмінці.",
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
      },
    );
  return new Response(merchantXml(await getProducts(), origin, s.name), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
