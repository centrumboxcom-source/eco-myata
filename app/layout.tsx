import type { Metadata } from "next";
import "./globals.css";
export const dynamic = "force-dynamic";
import ShopTools from "@/components/webmcp";
import Analytics from "@/components/analytics";
import { getSettings, siteOrigin } from "@/lib/settings";
import { getCategories } from "@/lib/catalog";
import ShopConfigProvider from "@/components/shop-config";
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(siteOrigin(settings)),
    title: {
      default: settings.name + " — " + settings.description,
      template: "%s | " + settings.name,
    },
    description: settings.description,
    openGraph: {
      locale: "uk_UA",
      type: "website",
      siteName: settings.name,
      images: ["/og.png"],
    },
    verification: { google: settings.google_verification || undefined },
    robots:
      settings.seo_visible && settings.store_open
        ? undefined
        : { index: false, follow: false },
    icons: { icon: "/favicon.svg" },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(),
  ]);
  return (
    <html lang="uk">
      <body>
        <ShopConfigProvider
          value={{
            freeShipping: settings.free_shipping,
            categories,
            name: settings.name,
            home: settings.homepage,
          }}
        >
          <Analytics
            mode={settings.analytics_mode}
            ga4={settings.ga4_id}
            gtm={settings.gtm_id}
          />
          <ShopTools />
          {children}
        </ShopConfigProvider>
      </body>
    </html>
  );
}
