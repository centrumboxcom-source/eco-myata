import Link from "next/link";
import { Header, Footer } from "@/components/shop";
import { getSettings } from "@/lib/settings";
export const metadata = {
  title: "Контакти",
  description:
    "Зв’яжіться з командою ЕКО М’ЯТА з питань товарів, доставки та замовлень.",
};
export default async function Page() {
  const s = await getSettings();
  return (
    <>
      <Header />
      <main className="container content-page">
        <div className="breadcrumb">
          <Link href="/">Головна</Link> / Контакти
        </div>
        <h1 className="page-title">Ми поруч.</h1>
        <p>
          Допоможемо обрати продукти та відповімо на запитання про ваше
          замовлення.
        </p>
        <h2>Зв’язок із крамницею</h2>
        {s.legal_name && <p>{s.legal_name}</p>}
        {s.tax_id && <p>Реквізити продавця: {s.tax_id}</p>}
        {s.address && <p>{s.address}</p>}
        {s.phone && (
          <p>
            <a href={"tel:" + s.phone.replace(/[^+\d]/g, "")}>{s.phone}</a>
          </p>
        )}
        {s.email && (
          <p>
            <a href={"mailto:" + s.email}>{s.email}</a>
          </p>
        )}
        {s.instagram &&
          /^https:\/\/(www\.)?instagram\.com\//.test(s.instagram) && (
            <p>
              <a href={s.instagram} target="_blank" rel="noopener noreferrer">
                Наш Instagram
              </a>
            </p>
          )}
        {!s.phone && !s.email && (
          <p className="notice">
            Крамниця готується до відкриття. Контакти для замовлень з’являться
            тут після запуску.
          </p>
        )}
        <p>Понеділок — п’ятниця, 9:00–18:00.</p>
        <Link href="/catalog" className="button">
          До каталогу
        </Link>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
