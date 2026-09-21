import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Leaf,
  Sprout,
  Nut,
  Cookie,
  Coffee,
  Amphora,
  Flower2,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { Header, Footer, ProductCard } from "@/components/shop";
import HomeHero from "@/components/home-hero";
import FormattedText from "@/components/formatted-text";
import Community from "@/components/community";
import { getSettings } from "@/lib/settings";
import { getProducts, getCategories } from "@/lib/catalog";
import { getPosts } from "@/lib/posts";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [settings, products, categories, posts] = await Promise.all([
    getSettings(),
    getProducts(),
    getCategories(),
    getPosts(),
  ]);
  const h = settings.homepage;
  const icons = [Sprout, Nut, Cookie, Coffee, Amphora, Flower2];
  const chosen = h.product_ids.length
    ? h.product_ids
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is (typeof products)[number] => !!p)
    : products.filter((p) => p.featured);
  const blocks: Record<string, React.ReactNode> = {
    benefits: (
      <section className="benefits container">
        {h.benefits.map((b, i) => {
          const Icon = [Sprout, Leaf, Truck, ShieldCheck][i % 4];
          return (
            <div key={i}>
              <Icon />
              <span>
                <b>{b.title}</b>
                <small>{b.text}</small>
              </span>
            </div>
          );
        })}
      </section>
    ),
    categories: (
      <section className="section container">
        <div className="section-heading">
          <h2>{h.categories_title}</h2>
          <Link className="underlined-link" href="/catalog">
            Усі категорії <ArrowRight size={17} />
          </Link>
        </div>
        <div className="categories">
          {categories
            .filter((c) => !c.parent_id)
            .map((c, i) => {
              const Icon = icons[i % icons.length];
              return (
                <Link
                  key={c.id}
                  href={"/category/" + c.id}
                  className="category-card"
                >
                  <div style={c.color ? { background: c.color } : undefined}>
                    {c.image ? (
                      <Image
                        src={c.image}
                        alt={c.name}
                        width={86}
                        height={86}
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <Icon size={43} strokeWidth={1.25} />
                    )}
                  </div>
                  <h3>{c.name}</h3>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
        </div>
      </section>
    ),
    products: (
      <section className="section container popular">
        <div className="section-heading">
          <h2>{h.products_title}</h2>
          <Link className="underlined-link" href="/catalog">
            Усі товари <ArrowRight size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {chosen.slice(0, h.product_count).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ),
    promo: h.promo.enabled ? (
      <section className="ritual container">
        <div>
          <span className="eyebrow">{h.promo.eyebrow}</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{h.promo.title}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{h.promo.text}</p>
          {h.promo.button && (
            <Link href={h.promo.href} className="button light">
              {h.promo.button}
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
        <div className="ritual-photo">
          <Image
            src={h.promo.image}
            fill
            sizes="(max-width:800px) 100vw,50vw"
            alt={h.promo.title}
          />
        </div>
      </section>
    ) : null,
    about: (
      <section className="about container section" id="about">
        <div className="about-heading">
          <h2 style={{ whiteSpace: "pre-line" }}>{h.about_title}</h2>
          <Leaf size={57} strokeWidth={1} />
        </div>
        <FormattedText text={h.about_text} />
      </section>
    ),
    blog: (
      <section className="community container section" id="community">
        <div className="section-heading">
          <h2>{h.blog_title}</h2>
          <Link href="/blog" className="underlined-link">
            Наші історії
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="journal-grid">
          {posts.slice(0, 3).map((a) => (
            <Link
              href={"/blog/" + a.slug}
              className="journal-card"
              key={a.slug}
            >
              <div>
                <Image src={a.image} alt={a.title} fill sizes="33vw" />
              </div>
              <h3>{a.title}</h3>
              <span className="underlined-link">
                Читати історію <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),
    community: <Community />,
  };
  return (
    <>
      <Header />
      <main>
        <HomeHero banners={h.banners} />
        {h.sections
          .filter((s) => s.enabled)
          .map((s) => (
            <div key={s.id}>{blocks[s.id]}</div>
          ))}
      </main>
      <Footer />
    </>
  );
}
