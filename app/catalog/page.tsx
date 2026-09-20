import { Suspense } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/shop";
import Catalog from "@/components/catalog";
import { getProducts, getCategories } from "@/lib/catalog";
export const metadata = {
  title: "Каталог натуральних продуктів",
  description:
    "Горіхи, суперфуди, чаї, корисні солодощі та натуральний догляд. Фільтри за складом та ціною.",
};
export default async function Page() {
  return (
    <>
      <Header />
      <main className="container">
        <div className="breadcrumb">
          <Link href="/">Головна</Link> / Каталог
        </div>
        <Suspense fallback={<p>Завантажуємо товари…</p>}>
          <Catalog
            products={await getProducts()}
            categories={await getCategories()}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
