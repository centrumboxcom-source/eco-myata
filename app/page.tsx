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
  Heart,
  Wheat,
  Milk,
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
  const categoryImageMap: Record<string, string> = {
    superfoods: "/images/chia.jpg",
    nuts: "/images/almond.jpg",
    sweets: "/images/bar.jpg",
    tea: "/images/tea.jpg",
    oils: "/images/oil.jpg",
    care: "/images/soap.jpg",
  };
  const blocks: Record<string, React.ReactNode> = {
    benefits: (
      <section className="benefits-pills container">
        {[
          { title: "Без цукру", icon: Leaf },
          { title: "Без глютену", icon: Wheat },
          { title: "Без лактози", icon: Milk },
          { title: "Веган", icon: Leaf },
          { title: "Натурально", icon: Heart },
          { title: "З турботою про вас", icon: Sprout },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="benefit-pill">
              <Icon size={34} strokeWidth={2.2} />
              <span>{item.title}</span>
            </div>
          );
        })}
      </section>
    ),
    categories: (
      <section className="section container">
        <div className="section-heading">
          <h2>{h.categories_title || "Категорії товарів"}</h2>
          <Link className="underlined-link" href="/catalog">
            Усі категорії <ArrowRight size={17} />
          </Link>
        </div>
        <div className="categories">
          {categories
            .filter((c) => !c.parent_id)
            .map((c) => {
              const bgImage = c.image || categoryImageMap[c.id] || "/images/chia.jpg";
              return (
                <Link
                  key={c.id}
                  href={"/category/" + c.id}
                  className="category-card"
                >
                  <div className="category-card-image">
                    <Image
                      src={bgImage}
                      alt={c.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="category-card-info">
                    <h3>{c.name}</h3>
                    <ArrowRight size={20} className="category-card-arrow" />
                  </div>
                </Link>
              );
            })}
        </div>
      </section>
    ),
    products: (
      <section className="section container popular">
        <div className="section-heading">
          <div>
            <h2>Ваші фаворити</h2>
            <p className="section-subtitle">Популярні товари, які обирають найчастіше.</p>
          </div>
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
