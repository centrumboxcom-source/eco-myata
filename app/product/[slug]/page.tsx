import Link from "next/link";
import { notFound } from "next/navigation";
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
  const p = (await getProducts()).find((p) => p.slug === slug);
  return p
    ? {
        alternates: { canonical: "/product/" + p.slug },
        title: p.name,
        description: p.description,
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
  const products = await getProducts();
  const p = products.find((p) => p.slug === slug);
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
      availability: p.stock
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
        <ProductDetail product={p} />
        <section className="section" style={{ paddingBottom: 65 }}>
          <div className="section-heading">
            <h2>Вам також може сподобатися</h2>
          </div>
          <div className="product-grid">
            {products
              .filter((x) => x.id !== p.id)
              .slice(0, 4)
              .map((x) => (
                <ProductCard key={x.id} product={x} />
              ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
