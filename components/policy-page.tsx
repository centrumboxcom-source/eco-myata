import Link from "next/link";
import { Header, Footer } from "./shop";
import { getSettings } from "@/lib/settings";
export default async function PolicyPage({
  kind,
}: {
  kind: "returns" | "terms";
}) {
  const s = await getSettings();
  const text = kind === "returns" ? s.returns_policy : s.terms;
  const title =
    kind === "returns" ? "Повернення та відшкодування" : "Умови продажу";
  return (
    <>
      <Header />
      <main className="container content-page">
        <div className="breadcrumb">
          <Link href="/">Головна</Link> / {title}
        </div>
        <h1 className="page-title">{title}</h1>
        {s.legal_name && (
          <p>
            {s.legal_name}
            {s.tax_id ? " · " + s.tax_id : ""}
          </p>
        )}
        {text ? (
          <div className="policy-text">{text}</div>
        ) : (
          <p className="notice">
            Умови готуються до відкриття магазину. Приймання замовлень буде
            доступне після їх публікації.
          </p>
        )}
        <Link className="button outline" href="/contacts">
          Контакти продавця
        </Link>
      </main>
      <Footer />
    </>
  );
}
