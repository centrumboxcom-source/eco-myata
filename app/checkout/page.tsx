import { integrationSecrets } from "@/lib/integration-secrets";
import Link from "next/link";
import { Header, Footer } from "@/components/shop";
import Checkout from "@/components/checkout";
import { configured, serviceClient } from "@/lib/server";
import { getSettings } from "@/lib/settings";
export const metadata = {
  title: "Оформлення замовлення",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const keys = await integrationSecrets([
    "MONOBANK_TOKEN",
    "LIQPAY_PRIVATE_KEY",
    "LIQPAY_PUBLIC_KEY",
  ]);
  const s = await getSettings();
  return (
    <>
      <Header />
      <main className="container">
        <div className="breadcrumb">
          <Link href="/">Головна</Link> / Оформлення замовлення
        </div>
        <h1 className="page-title">Майже у вас 🌿</h1>
        <Checkout
          configured={!!serviceClient() && s.store_open}
          methods={{
            np: s.np,
            ukr: s.ukr,
            courier: s.courier,
            cod: s.cod,
            mono: s.mono && !!keys.MONOBANK_TOKEN,
            liqpay:
              s.liqpay && !!keys.LIQPAY_PRIVATE_KEY && !!keys.LIQPAY_PUBLIC_KEY,
            bank: s.bank && !!s.iban,
          }}
          freeShipping={s.free_shipping}
        />
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
