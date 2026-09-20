import Link from "next/link";
import { inStock } from "@/lib/inventory";
import { resolveProduct } from "@/lib/resolve-product";
import { notFound, permanentRedirect } from "next/navigation";
import { Header, Footer, ProductCard } from "@/components/shop";
import ProductDetail from "@/components/product-detail";
import { getProducts } from "@/lib/catalog";
import { getSettings, siteOrigin } from "@/lib/settings";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product: p } = await resolveProduct(slug);
  return p
    ? {
        alternates: { canonical: "/product/" + p.slug },
        title: p.seo_title || p.name,
        robots: p.noindex ? { index: false, follow: true } : undefined,
        description: p.seo_description || p.description,
        openGraph: {
          title: p.name,
          description: p.description,
          images: [p.image],
        },
        twitter: {
          card: "summary_large_image",
          title: p.name,
          description: p.description,
          images: [p.image],
        },
      }
    : { title: "Товар не знайдено" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product: p, products, redirect } = await resolveProduct(slug);
  if (p && redirect) permanentRedirect("/product/" + p.slug);
  if (!p) notFound();
  const settings = await getSettings();
  const origin = siteOrigin(settings);
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: new URL(p.image, siteOrigin(settings)).href,
    sku: p.id,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    gtin: p.gtin || undefined,
    mpn: p.mpn || undefined,
    offers: {
      "@type": "Offer",
      url: new URL("/product/" + p.slug, origin).href,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: settings.legal_name || settings.name,
      },
      priceCurrency: "UAH",
      price: p.price,
      availability: inStock(p)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  return (
    <>
      <Header />
      <main className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
          }}
        />
        <div className="breadcrumb">
          <Link href="/">Головна</Link> / <Link href="/catalog">Каталог</Link> /{" "}
          {p.name}
        </div>
        <ProductDetail
          key={p.id}
          product={p}
          variants={
            p.variant_group
              ? products.filter((x) => x.variant_group === p.variant_group)
              : []
          }
        />
        {p.related_mode !== "off" && (
          <section className="section" style={{ paddingBottom: 65 }}>
            <div className="section-heading">
              <h2>Вам також може сподобатися</h2>
            </div>
            <div className="product-grid">
              {products
                .filter(
                  (x) =>
                    x.id !== p.id &&
                    (p.related_mode === "manual"
                      ? (p.related_ids || []).includes(x.id)
                      : x.category === (p.related_category || p.category) ||
                        x.category_ids?.includes(
                          p.related_category || p.category,
                        )),
                )
                .sort((a, b) =>
                  p.related_mode === "manual"
                    ? (p.related_ids || []).indexOf(a.id) -
                      (p.related_ids || []).indexOf(b.id)
                    : Number(b.featured) - Number(a.featured),
                )
                .slice(0, p.related_limit || 4)
                .map((x) => (
                  <ProductCard key={x.id} product={x} />
                ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
