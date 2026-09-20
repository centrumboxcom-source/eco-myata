import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header, Footer } from "@/components/shop";
import Catalog from "@/components/catalog";
import FormattedText from "@/components/formatted-text";
import { getCategories, getProducts } from "@/lib/catalog";
import { categoryBranch } from "@/lib/product-admin";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = (await getCategories()).find((c) => c.id === id);
  return c
    ? {
        title: c.seo_title || c.name,
        description: c.seo_description || c.description,
        alternates: { canonical: "/category/" + c.id },
        robots: c.noindex ? { index: false, follow: true } : undefined,
      }
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await getCategories();
  const c = categories.find((c) => c.id === id);
  if (!c) notFound();
  const ids = categoryBranch(categories, id);
  const products = (await getProducts()).filter(
    (p) =>
      ids.includes(p.category) || p.category_ids?.some((c) => ids.includes(c)),
  );
  return (
    <>
      <Header />
      <main className="container">
        <div className="breadcrumb">
          <Link href="/catalog">Каталог</Link> / {c.name}
        </div>
        <div className="category-page-heading">
          {c.image && (
            <Image src={c.image} alt={c.name} width={160} height={160} />
          )}
          <div>
            <h1 className="page-title">{c.name}</h1>
            {c.description && <FormattedText text={c.description} />}
          </div>
        </div>
        {categories.filter((x) => x.parent_id === id).length > 0 && (
          <div className="store-variants">
            {categories
              .filter((x) => x.parent_id === id)
              .map((x) => (
                <Link href={"/category/" + x.id} key={x.id}>
                  {x.name}
                </Link>
              ))}
          </div>
        )}
        <Suspense fallback={<p>Завантажуємо…</p>}>
          <Catalog products={products} categories={categories} hideHeading />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
