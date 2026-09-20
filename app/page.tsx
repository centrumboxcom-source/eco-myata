import Link from "next/link";
import Community from "@/components/community";
import { getPosts } from "@/lib/posts";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/data";
export const dynamic = "force-dynamic";
import Image from "next/image";
import {
  ArrowRight,
  Leaf,
  Truck,
  ShieldCheck,
  Sprout,
  Nut,
  Cookie,
  Coffee,
  Amphora,
  Flower2,
  Star,
  Instagram,
  Check,
} from "lucide-react";
import { Header, Footer, ProductCard } from "@/components/shop";

import { getProducts, getCategories } from "@/lib/catalog";
const icons = [Sprout, Nut, Cookie, Coffee, Amphora, Flower2];
export default async function Home() {
  const settings = await getSettings();
  const products = await getProducts();
  const categories = await getCategories();
  const posts = (await getPosts()).slice(0, 3);
  return (
    <>
      <Header />
      <main>
        <section className="hero container">
          <Image
            className="hero-image"
            src="/images/hero.png"
            alt="Добірні горіхи, насіння, натуральна паста та свіжа м’ята"
            fill
            priority
            sizes="100vw"
          />
          <div className="hero-content">
            <span className="hero-kicker">
              <span /> ВІД ПРИРОДИ. ДЛЯ ВАС.
            </span>
            <h1>
              Природно
              <br />
              бути <em>собою.</em>
            </h1>
            <p>
              Корисні продукти з чистим складом.
              <br />
              Для маленьких ритуалів і великої любові до себе.
            </p>
            <Link href="/catalog" className="button">
              Обрати своє корисне <ArrowRight size={19} />
            </Link>
            <div className="hero-bottom">
              <span className="hero-leaf">
                <Leaf size={21} />
              </span>
              <span>
                Тільки те, що дала природа.
                <br />
                <b>Нічого зайвого.</b>
              </span>
            </div>
          </div>
          <div className="hero-stamp">
            <Leaf size={25} />
            <span>
              100%<small>ПРИРОДНА КОРИСТЬ</small>
            </span>
          </div>
          <div className="hero-pagination">
            <i />
            <i />
            <i />
          </div>
          <span className="hero-caption">
            ваш щоденний вибір на користь себе
          </span>
        </section>
        <section className="benefits container">
          <div>
            <Sprout />
            <span>
              <b>Чистий склад</b>
              <small>Без зайвого. Лише натуральне.</small>
            </span>
          </div>
          <div>
            <Leaf />
            <span>
              <b>З турботою про природу</b>
              <small>Свідомий вибір кожного дня</small>
            </span>
          </div>
          <div>
            <Truck />
            <span>
              <b>Доставка по Україні</b>
              <small>Безкоштовно від {money(settings.free_shipping)}</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>Обираємо як для себе</b>
              <small>Перевіряємо кожен продукт</small>
            </span>
          </div>
        </section>
        <section className="section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ВАША ПОЛИЧКА КОРИСТІ</span>
              <h2>Що вам до смаку?</h2>
            </div>
            <Link className="underlined-link" href="/catalog">
              Усі категорії <ArrowRight size={17} />
            </Link>
          </div>
          <div className="categories">
            {categories.map((c, i) => {
              const Icon = icons[i % icons.length];
              return (
                <Link
                  key={c.id}
                  href={"/catalog?category=" + c.id}
                  className="category-card"
                >
                  <div style={{ background: c.color || "#edf1e3" }}>
                    <Icon size={43} strokeWidth={1.25} />
                  </div>
                  <h3>{c.name}</h3>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </div>
        </section>
        <section className="section container popular">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ОБИРАЙТЕ СВОЇХ ФАВОРИТІВ</span>
              <h2>Маленькі фаворити. Велика користь.</h2>
            </div>
            <Link className="underlined-link" href="/catalog">
              Усі товари <ArrowRight size={17} />
            </Link>
          </div>
          <div className="product-grid">
            {products
              .filter((p) => p.featured)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </section>
        <section className="ritual container">
          <div>
            <span className="eyebrow">СМАЧНА ТУРБОТА ПРО СЕБЕ</span>
            <h2>
              Хороший день
              <br />
              починається з малого.
            </h2>
            <p>
              Жменя горіхів. Чашка трав’яного чаю.
              <br />
              Хвилинка для себе. Знайдіть свій ритуал.
            </p>
            <Link href="/catalog?category=tea" className="button light">
              Додати затишку <ArrowRight size={18} />
            </Link>
          </div>
          <div className="ritual-photo">
            <Image
              src="/images/hero.png"
              fill
              sizes="50vw"
              alt="Природні інгредієнти для щоденних ритуалів"
            />
          </div>
          <span className="ritual-handwritten">живіть у своєму ритмі</span>
        </section>
        <section className="about container section" id="about">
          <div className="about-heading">
            <span className="eyebrow">ПРИВІТ, МИ — ЕКО М’ЯТА</span>
            <h2>
              Ближче до природи.
              <br />
              <em>Ближче до себе.</em>
            </h2>
            <Leaf size={57} strokeWidth={1} />
          </div>
          <div>
            <p>
              Ми віримо, що турбота про себе починається з простих речей. Із
              того, що ви кладете до своєї тарілки. З маленьких щоденних
              виборів.
            </p>
            <p>
              Тому збираємо в одній крамниці натуральні продукти з прозорим
              складом — від добірних горіхів до ароматних трав’яних чаїв. Щоб
              корисне було смачним, а вибір — легким.
            </p>
            <span className="about-sign">
              З теплом, команда Еко М’ята <HeartIcon />
            </span>
          </div>
        </section>
        <section className="community container section" id="community">
          <div className="section-heading">
            <div>
              <span className="eyebrow">НАТХНЕННЯ НА ЩОДЕНЬ</span>
              <h2>Корисне — це спосіб життя.</h2>
            </div>
            <Link href="/blog" className="underlined-link">
              Наші історії <ArrowRight size={17} />
            </Link>
          </div>
          <div className="journal-grid">
            {posts.map((a) => (
              <Link
                href={"/blog/" + a.slug}
                className="journal-card"
                key={a.slug}
              >
                <div>
                  <Image src={a.image} alt={a.title} fill sizes="33vw" />
                </div>
                <span className="eyebrow">ІСТОРІЇ ТА РЕЦЕПТИ</span>
                <h3>{a.title}</h3>
                <span className="underlined-link">
                  Читати історію <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <Community />
      </main>
      <Footer />
    </>
  );
}
function HeartIcon() {
  return <Check size={18} />;
}
