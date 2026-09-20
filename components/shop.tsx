"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderSearch from "./header-search";
import { usePrice, useShopConfig } from "./shop-config";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Leaf,
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  Menu,
  X,
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  Truck,
  ChevronDown,
  Instagram,
} from "lucide-react";
import { useShop } from "@/lib/store";
import { inStock } from "@/lib/inventory";
import { categories, money, type Product } from "@/lib/data";
export function Logo() {
  const { name, home } = useShopConfig();
  return (
    <Link href="/" className="logo" aria-label="ЕКО М’ЯТА — головна">
      <Leaf size={34} strokeWidth={1.5} />
      <span>
        {name}
        <small>{home.tagline}</small>
      </span>
    </Link>
  );
}
export function Header() {
  const money = usePrice();
  const { freeShipping, categories, home } = useShopConfig();
  const [menu, setMenu] = useState(false);
  const [ready, setReady] = useState(false);
  const { items, setCartOpen } = useShop();
  useEffect(() => setReady(true), []);
  return (
    <>
      {home.announcement_enabled && (
        <div className="announcement">
          <Leaf size={13} /> {home.announcement}{" "}
          <span>
            Безкоштовна доставка від {money(freeShipping)}{" "}
            <ArrowRight size={13} />
          </span>
        </div>
      )}
      <header className="header">
        <div className="container header-main">
          <button
            className="icon-button mobile-only"
            aria-label="Відкрити меню"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <Logo />
          <HeaderSearch />
          <div className="header-actions">
            <Link
              className="icon-button account-link"
              aria-label="Мій кабінет"
              href="/account"
            >
              <UserRound size={23} />
            </Link>
            <Link
              className="icon-button favorite-link"
              aria-label="Обрані товари"
              href="/catalog?favorites=1"
            >
              <Heart size={23} />
            </Link>
            <span className="action-divider" />
            <button
              className="cart-trigger"
              onClick={() => setCartOpen(true)}
              aria-label="Відкрити кошик"
            >
              <span className="bag-icon">
                <ShoppingBag size={24} />
                <b>{ready ? items.reduce((n, i) => n + i.quantity, 0) : 0}</b>
              </span>
              <span className="cart-label">
                Кошик
                <small>
                  {money(
                    ready
                      ? items.reduce(
                          (n, i) => n + i.product.price * i.quantity,
                          0,
                        )
                      : 0,
                  )}
                </small>
              </span>
            </button>
          </div>
        </div>
        <div className="mobile-search-bar container mobile-only">
          <HeaderSearch />
        </div>
        <nav className="container nav">
          <Link href="/catalog" className="catalog-nav">
            <Menu size={18} /> Каталог товарів <ChevronDown size={15} />
          </Link>
          {home.navigation.map((l) => (
            <Link key={l.href + l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
          <span className="nav-note">
            <span /> З турботою про вас і природу
          </span>
        </nav>
      </header>
      {menu && (
        <div className="overlay" onClick={() => setMenu(false)}>
          <aside className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-button close"
              onClick={() => setMenu(false)}
              aria-label="Закрити меню"
            >
              <X />
            </button>
            <Logo />
            <HeaderSearch onNavigate={() => setMenu(false)} />
            {[
              ["/catalog", "Усі товари"],
              ...categories.map((c) => ["/catalog?category=" + c.id, c.name]),
              ...home.navigation.map((l) => [l.href, l.label]),
              ["/account", "Мій кабінет"],
            ].map(([href, label]) => (
              <Link href={href} key={href} onClick={() => setMenu(false)}>
                {label}
                <ArrowRight size={16} />
              </Link>
            ))}
          </aside>
        </div>
      )}
      <CartDrawer />
    </>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const { categories, commerce } = useShopConfig();
  const router = useRouter();
  const money = usePrice();
  const [added, setAdded] = useState(false);
  const { add, favorites, toggleFavorite } = useShop();
  return (
    <article className={"product-card badge-" + commerce.badge_position}>
      <div className={"product-image image-" + p.id}>
        <Link href={"/product/" + p.slug}>
          <Image
            src={p.image}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 45vw, 25vw"
          />
        </Link>
        {commerce.show_badges && (
          <span className={"product-badge " + (p.old_price ? "discount" : "")}>
            {p.badge ||
              (p.old_price && p.old_price > p.price
                ? `−${Math.round((1 - p.price / p.old_price) * 100)}%`
                : "Натуральний склад")}
          </span>
        )}
        <button
          className={"favorite " + (favorites.includes(p.id) ? "selected" : "")}
          aria-label={"Додати в обране: " + p.name}
          onClick={() => toggleFavorite(p.id)}
        >
          <Heart
            size={19}
            fill={favorites.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="product-details">
        <span className="product-category">
          {categories.find((c) => c.id === p.category)?.name}
        </span>
        <Link href={"/product/" + p.slug}>
          <h3>{p.name}</h3>
        </Link>
        <div className="product-weight">
          {p.weight}
          <span>{p.tags[0]}</span>
        </div>
        <div className="product-bottom">
          <div>
            <strong>{money(p.price)}</strong>
            {p.old_price && <del>{money(p.old_price)}</del>}
          </div>
          <button
            aria-label={"Купити " + p.name}
            disabled={!inStock(p)}
            onClick={() => {
              if (commerce.card_action === "product") {
                router.push("/product/" + p.slug);
                return;
              }
              add(p, 1, commerce.card_action === "drawer");
              setAdded(true);
            }}
          >
            <Plus size={20} />
            <span>
              {commerce.card_action === "product"
                ? "Докладніше"
                : added
                  ? "Додано"
                  : "У кошик"}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
export function CartDrawer() {
  const money = usePrice();
  const { freeShipping } = useShopConfig();
  const { items, cartOpen, setCartOpen, setQuantity } = useShop();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!cartOpen) return;
    const previous = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".cart-drawer button,.cart-drawer a",
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [cartOpen, setCartOpen]);
  if (!cartOpen) return null;
  const total = items.reduce((s, i) => s + i.quantity * i.product.price, 0);
  return (
    <div className="overlay" onClick={() => setCartOpen(false)}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ваш кошик"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-heading">
          <h2>
            Ваш кошик <span>({items.length})</span>
          </h2>
          <button
            ref={closeRef}
            className="icon-button"
            onClick={() => setCartOpen(false)}
            aria-label="Закрити кошик"
          >
            <X />
          </button>
        </div>
        {!items.length ? (
          <div className="empty-state">
            <ShoppingBag size={50} />
            <h3>Тут поки що порожньо</h3>
            <p>Додайте трохи природної користі.</p>
            <Link
              href="/catalog"
              className="button"
              onClick={() => setCartOpen(false)}
            >
              До каталогу <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <p className="shipping-note">
              <Truck size={18} />
              {total >= freeShipping
                ? "Ваша доставка безкоштовна!"
                : `Ще ${money(freeShipping - total)} до безкоштовної доставки`}
            </p>
            <div className="cart-items">
              {items.map(({ product: p, quantity }) => (
                <div className="cart-item" key={p.id}>
                  <Image src={p.image} alt={p.name} width={82} height={90} />
                  <div>
                    <Link
                      href={"/product/" + p.slug}
                      onClick={() => setCartOpen(false)}
                    >
                      {p.name}
                    </Link>
                    <small>{p.weight}</small>
                    <div className="quantity">
                      <button
                        aria-label="Зменшити кількість"
                        onClick={() => setQuantity(p.id, quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{quantity}</span>
                      <button
                        aria-label="Збільшити кількість"
                        onClick={() => setQuantity(p.id, quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-end">
                    <strong>{money(p.price * quantity)}</strong>
                    <button
                      className="icon-button"
                      aria-label={"Видалити " + p.name}
                      onClick={() => setQuantity(p.id, 0)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <span>Разом</span>
              <strong>{money(total)}</strong>
            </div>
            <Link
              href="/checkout"
              className="button full"
              onClick={() => setCartOpen(false)}
            >
              Оформити замовлення <ArrowRight size={18} />
            </Link>
            <button className="text-button" onClick={() => setCartOpen(false)}>
              Продовжити покупки
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
export function Footer() {
  const { commerce } = useShopConfig();
  const { home } = useShopConfig();
  const [message, setMessage] = useState("");
  return (
    <footer>
      {home.newsletter_enabled && (
        <div className="newsletter container">
          <div>
            <span className="eyebrow">ЛИСТИ З КОРИСТЮ</span>
            <h2>{home.newsletter_title}</h2>
            <p>{home.newsletter_text}</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = new FormData(form).get("email");
              try {
                const r = await fetch("/api/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                const d = await r.json();
                setMessage(d.message);
                if (r.ok) form.reset();
              } catch {
                setMessage("Не вдалося з’єднатися. Спробуйте пізніше.");
              }
            }}
          >
            <div className="newsletter-input">
              <input
                type="email"
                required
                name="email"
                placeholder="Ваша електронна пошта"
                aria-label="Електронна пошта"
              />
              <button aria-label="Підписатися">
                <ArrowRight size={22} />
              </button>
            </div>
            <small>
              {message ||
                "Підписуючись, ви погоджуєтеся з політикою конфіденційності."}
            </small>
          </form>
        </div>
      )}
      <div className="footer-main container">
        <div>
          <Logo />
          <p>
            Обирайте природне.
            <br />
            Відчувайте себе добре.
          </p>
        </div>
        <div>
          <h4>Крамниця</h4>
          <Link href="/catalog">Каталог товарів</Link>
          <Link href="/catalog?sort=new">Новинки</Link>
          <Link href="/catalog?sale=1">Акційні пропозиції</Link>
        </div>
        <div>
          <h4>Інформація</h4>
          {home.footer_links.map((l) => (
            <Link key={l.href + l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
          <button
            className="text-button"
            onClick={() => window.dispatchEvent(new Event("eko:privacy"))}
          >
            Налаштування cookies
          </button>
        </div>
        <div>
          <h4>Ми поруч</h4>
          <Link href="/contacts">
            Зв’язатися з нами <ArrowRight size={14} />
          </Link>
          <p>{commerce.working_hours}</p>
          {commerce.social_links.map((l, i) => (
            <a
              key={i}
              href={l.href}
              target="_blank"
              rel={"noopener noreferrer" + (l.nofollow ? " nofollow" : "")}
            >
              {l.label}
            </a>
          ))}
          <Link href="/#community">
            <Instagram size={18} /> Наша спільнота
          </Link>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} ЕКО М’ЯТА. З турботою, щодня.</span>
        <span>VISA　 mastercard　  Pay</span>
        <Link href="/admin">Керування магазином</Link>
      </div>
    </footer>
  );
}
