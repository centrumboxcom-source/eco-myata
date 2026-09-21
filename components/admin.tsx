"use client";
import AdminSecrets from "./admin-secrets";
import AdminNotifications from "./admin-notifications";
import AdminCommerce from "./admin-commerce";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderTree,
  TicketPercent,
  Truck,
  BookOpen,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Download,
  Leaf,
  Users,
  Wallet,
  ChartNoAxesCombined,
  LogOut,
  Upload,
  Check,
  MessageCircle,
} from "lucide-react";
import { Logo } from "./shop";
import ProductEditor from "./admin-product-editor";
import Products from "./admin-products";
import Categories, { CategoryEditor } from "./admin-categories";
import Homepage from "./admin-homepage";
import Customers from "./admin-customers";
import { productSchema } from "@/lib/validation";
import { productExtras } from "@/lib/product-admin";
import AdminSettings from "./admin-settings";
import AdminImage from "./admin-image";
import Readiness from "./admin-readiness";
import AdminDashboard from "./admin-dashboard";
import { defaultSettings } from "@/lib/store-settings";
import {
  products as sampleProducts,
  categories as sampleCategories,
  money,
  type Product,
} from "@/lib/data";
import { browserClient } from "@/lib/supabase-browser";
type Row = Record<string, any>;
const nav = [
  ["dashboard", "Загальна інформація", LayoutDashboard],
  ["homepage", "Головна сторінка", LayoutDashboard],
  ["products", "Товари", Package],
  ["orders", "Замовлення", ShoppingBag],
  ["categories", "Категорії", FolderTree],
  ["promocodes", "Промокоди", TicketPercent],
  ["payments", "Оплата та доставка", Truck],
  ["posts", "Блог / Статті", BookOpen],
  ["reviews", "Відгуки", MessageCircle],
  ["customers", "Клієнти", Users],
  ["subscribers", "Підписники", Users],
  ["settings", "Налаштування", Settings],
  ["notifications", "Сповіщення та листи", MessageCircle],
  ["secrets", "Ключі сервісів", Wallet],
  ["policies", "Дані продавця та умови", BookOpen],
  ["integrations", "Google та аналітика", ChartNoAxesCombined],
  ["readiness", "Готовність до запуску", Check],
] as const;
const defaults = defaultSettings;
const statuses = ["Нове", "В обробці", "Відправлено", "Виконано", "Скасовано"];
export default function Admin({ demo }: { demo: boolean }) {
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState<Record<string, Row[]>>({
    products: demo ? sampleProducts : [],
    categories: demo ? sampleCategories : [],
    orders: [],
    promocodes: [],
    posts: [],
    reviews: [],
  });
  const [settings, setSettings] = useState<Row>(defaults);
  const savedSettings = useRef<Row>(defaults);
  const [loading, setLoading] = useState(!demo);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Row | null>(null);
  const [remove, setRemove] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState("30");
  const [detail, setDetail] = useState<Row | null>(null);
  const [archive, setArchive] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  useEffect(() => {
    if (demo) return;
    Promise.all(
      [
        "products",
        "orders",
        "categories",
        "promocodes",
        "posts",
        "reviews",
        "settings",
      ].map(async (key) => {
        const r = await fetch("/api/admin/" + key);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        return [key, d] as const;
      }),
    )
      .then((values) => {
        const next: Record<string, Row[]> = {};
        values.forEach(([key, value]) => {
          if (key === "settings") {
            savedSettings.current = { ...defaults, ...value[0]?.value };
            setSettings(savedSettings.current);
          } else next[key] = value;
        });
        setData(next);
      })
      .catch((e) => {
        setMessage(e.message);
        setLoadError(e.message);
      })
      .finally(() => setLoading(false));
  }, [demo]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setSearch("");
    setStatus("");
    setMessage("");
  }, [view]);
  useEffect(() => {
    if (!editor && !remove && !detail) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !["products", "categories"].includes(view)) {
        setEditor(null);
        setRemove(null);
        setDetail(null);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [editor, remove, detail]);
  const save = async (resource: string, record: Row) => {
    if (loadError) return;
    setBusy(true);
    try {
      if (demo) {
        if (resource === "settings") {
          savedSettings.current = record.value;
          setSettings(record.value);
        } else
          setData((s) => ({
            ...s,
            [resource]: s[resource].some((r) => r.id === record.id)
              ? s[resource].map((r) =>
                  r.id === record.id ? { ...r, ...record } : r,
                )
              : [
                  ...s[resource],
                  { ...record, id: record.id || crypto.randomUUID() },
                ],
          }));
        setMessage(
          "Зміни застосовано в демонстраційному перегляді до оновлення сторінки.",
        );
      } else {
        const r = await fetch("/api/admin/" + resource, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        if (resource === "settings") {
          savedSettings.current = d.value;
          setSettings(d.value);
        } else if (resource === "orders")
          setData((s) => ({
            ...s,
            orders: s.orders.map((o) => (o.id === record.id ? d : o)),
          }));
        else
          setData((s) => ({
            ...s,
            [resource]: s[resource].some((x) => x.id === d.id)
              ? s[resource].map((x) => (x.id === d.id ? d : x))
              : [...s[resource], d],
          }));
        if (resource === "orders") {
          setDetail((current) => (current?.id === d.id ? d : current));
          const r = await fetch("/api/admin/products");
          if (r.ok) {
            const products = await r.json();
            setData((s) => ({ ...s, products }));
          }
        }
        setMessage("Зміни збережено.");
      }
      setEditor(null);
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const create = () => {
    if (view === "products")
      setEditor({
        id: crypto.randomUUID(),
        slug: "",
        name: "",
        category: data.categories[0]?.id || "superfoods",
        price: 0,
        old_price: null,
        weight: "200 г",
        stock: 0,
        tags: [],
        image: "/images/chia.jpg",
        description: "",
        ingredients: "",
        nutrition: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
        featured: false,
        active: false,
        additional_images: [],
      });
    else if (view === "categories")
      setEditor({ id: "", name: "", parent_id: null, sort_order: 0 });
    else if (view === "promocodes")
      setEditor({
        code: "",
        type: "percent",
        value: 10,
        min_order: 0,
        max_uses: null,
        expires_at: null,
        active: true,
      });
    else
      setEditor({
        slug: "",
        title: "",
        excerpt: "",
        content: "",
        image: "/images/hero.png",
        published: false,
      });
  };

  const closeEditor = () => {
    if (busy) return;
    if (
      editor &&
      !window.confirm("Закрити редактор? Незбережені зміни буде втрачено.")
    )
      return;
    setEditor(null);
    setMessage("");
  };
  const duplicate = (p: Row, variant = false) => {
    const id = crypto.randomUUID();
    const { created_at, updated_at, ...source } = p;
    setEditor({
      ...source,
      id,
      name: p.name + (variant ? "" : " (копія)"),
      slug: p.slug + "-" + id.slice(0, 6),
      sku: "",
      active: false,
      merchant_enabled: false,
      variant_group: variant ? p.variant_group || p.id : "",
      variant_label: variant ? "" : p.variant_label,
      internal_note: "",
    });
  };
  const refreshProducts = async () => {
    if (demo) {
      setMessage("Демонстраційні дані актуальні.");
      return;
    }
    try {
      const r = await fetch("/api/admin/products");
      const d = await r.json();
      if (!r.ok) throw Error(d.message);
      setData((s) => ({ ...s, products: d }));
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const bulk = async (ids: string[], changes: Row) => {
    setBusy(true);
    try {
      if (!demo) {
        const r = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, changes }),
        });
        if (!r.ok) throw Error((await r.json()).message);
        await refreshProducts();
      } else
        setData((s) => ({
          ...s,
          products: s.products.map((p) =>
            ids.includes(p.id) ? { ...p, ...changes } : p,
          ),
        }));
      setMessage(
        demo ? "Зміни застосовано в демоперегляді." : "Товари оновлено.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const makeVariant = async (p: Row) => {
    const parsed = productSchema.safeParse({
      ...p,
      variant_group: p.variant_group || p.id,
    });
    if (!parsed.success) {
      setMessage(
        parsed.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      );
      return;
    }
    if (await save("products", parsed.data)) duplicate(parsed.data, true);
  };
  const categoryCreate = (parent?: string) =>
    setEditor({ id: "", name: "", parent_id: parent || null, sort_order: 0 });
  const orders = data.orders || [];
  const recent = orders.filter(
    (o) =>
      Date.now() - new Date(o.created_at).getTime() < Number(period) * 86400000,
  );
  const valid = recent.filter((o) => o.status !== "Скасовано");
  const revenue = valid
    .filter((o) => o.payment_status === "paid" || o.status === "Виконано")
    .reduce((n, o) => n + Number(o.total), 0);
  const rows = (data[view] || [])
    .filter(
      (r) =>
        view !== "products" ||
        (archive ? r.active === false : r.active !== false),
    )
    .filter(
      (r) =>
        JSON.stringify([r.name, r.title, r.code, r.id, r.email, r.phone])
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!status || r.status === status),
    );
  const title = nav.find((n) => n[0] === view)?.[1];
  const exportOrders = () => {
    const safe = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'")
        .replaceAll('"', '""') +
      '"';
    const csv =
      "\ufeff" +
      [
        ["Номер", "Дата", "Покупець", "Телефон", "Статус", "Сума", "ТТН"],
        ...orders.map((o) => [
          o.id,
          o.created_at,
          o.name + " " + o.last_name,
          o.phone,
          o.status,
          o.total,
          o.ttn,
        ]),
      ]
        .map((r) => r.map(safe).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "eko-myata-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (loadError)
    return (
      <main className="auth-card">
        <h1>Не вдалося завантажити панель</h1>
        <p role="alert">{loadError}</p>
        <p>
          Перевірте з’єднання, вхід і міграції бази. Збереження вимкнено, поки
          дані не завантажаться.
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          Спробувати знову
        </button>
        <Link href="/">До магазину</Link>
      </main>
    );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        {nav.map(([id, label, Icon], i) => (
          <div key={id}>
            {i === 1 && <p className="admin-nav-label">ВАШ МАГАЗИН</p>}
            {i === 6 && (
              <p className="admin-nav-label">КОНТЕНТ І НАЛАШТУВАННЯ</p>
            )}
            <button
              className={view === id ? "active" : ""}
              onClick={() => {
                if (busy) return;
                if (
                  JSON.stringify(settings) !==
                  JSON.stringify(savedSettings.current)
                ) {
                  if (
                    !window.confirm(
                      "Є незбережені налаштування. Перейти й скасувати зміни?",
                    )
                  )
                    return;
                  setSettings(savedSettings.current);
                }
                if (
                  editor &&
                  !window.confirm("Перейти до іншого розділу без збереження?")
                )
                  return;
                setEditor(null);
                setView(id);
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          </div>
        ))}
        <div className="sidebar-bottom">
          <Link href="/" className="underlined-link">
            <ArrowUpRight size={17} /> Перейти до магазину
          </Link>
          {!demo && (
            <button
              onClick={async () => {
                await browserClient()?.auth.signOut();
                window.location.reload();
              }}
            >
              <LogOut size={17} /> Вийти
            </button>
          )}
        </div>
      </aside>
      <main className="admin-content">
        <div className="admin-topbar">
          <span>Ваш магазин / {title}</span>
          <span>
            <Leaf size={17} /> ЕКО М’ЯТА <i className="admin-avatar">ЕМ</i>
          </span>
        </div>
        {demo && (
          <p className="admin-demo">
            <Leaf size={15} />
            Демонстраційна панель. Зміни діють до оновлення сторінки. Для
            постійного збереження підключіть Supabase.
          </p>
        )}
        <div
          className="admin-page-heading"
          style={
            editor || ["settings", "secrets", "notifications"].includes(view)
              ? { display: "none" }
              : undefined
          }
        >
          <div>
            <h1>
              {view === "dashboard" ? "Вітаємо у вашому магазині 🌿" : title}
            </h1>
            <p>
              {view === "dashboard"
                ? "Усе важливе про вашу крамницю — в одному місці."
                : "Керуйте магазином легко та з турботою."}
            </p>
          </div>
          {["products", "categories", "promocodes", "posts"].includes(view) && (
            <button className="button" onClick={create}>
              <Plus size={16} />{" "}
              {view === "products"
                ? "Додати товар"
                : view === "categories"
                  ? "Додати категорію"
                  : view === "posts"
                    ? "Нова стаття"
                    : "Створити промокод"}
            </button>
          )}
          {view === "orders" && (
            <button className="button outline" onClick={exportOrders}>
              <Download size={16} /> CSV завантажених замовлень
            </button>
          )}
          {view === "dashboard" && (
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="1">Сьогодні</option>
              <option value="7">Останні 7 днів</option>
              <option value="30">Останні 30 днів</option>
            </select>
          )}
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {loading ? (
          <p>Завантажуємо дані магазину…</p>
        ) : editor && view === "products" ? (
          <ProductEditor
            key={editor.id}
            value={editor}
            categories={data.categories}
            products={data.products}
            demo={demo}
            busy={busy}
            message={message}
            origin={settings.site_url || ""}
            onChange={setEditor}
            onSave={(p) => save("products", p)}
            onClose={closeEditor}
            onOpen={(p) => {
              if (
                window.confirm(
                  "Відкрити інший варіант без збереження поточного?",
                )
              )
                setEditor(p);
            }}
            onVariant={makeVariant}
            onDuplicate={(p) => duplicate(p)}
          />
        ) : editor && view === "categories" ? (
          <CategoryEditor
            key={editor._existing ? editor.id : "new"}
            value={editor}
            categories={data.categories}
            products={data.products}
            demo={demo}
            busy={busy}
            message={message}
            origin={settings.site_url || ""}
            onChange={setEditor}
            onSave={(c) => save("categories", c)}
            onClose={closeEditor}
            onProduct={(p) => {
              if (
                window.confirm("Перейти до товару без збереження категорії?")
              ) {
                setView("products");
                setEditor(p);
              }
            }}
          />
        ) : view === "products" ? (
          <Products
            products={data.products}
            categories={data.categories}
            busy={busy}
            onEdit={setEditor}
            onDuplicate={(p) => duplicate(p)}
            onBulk={bulk}
            onRefresh={refreshProducts}
          />
        ) : view === "categories" ? (
          <Categories
            categories={data.categories}
            products={data.products}
            onEdit={setEditor}
            onCreate={categoryCreate}
            onRemove={setRemove}
          />
        ) : view === "homepage" ? (
          <Homepage
            settings={settings}
            products={data.products}
            demo={demo}
            busy={busy}
            onSave={(value) => save("settings", { id: "store", value })}
          />
        ) : ["customers", "subscribers"].includes(view) ? (
          <Customers
            key={view}
            demo={demo}
            subscribers={view === "subscribers"}
          />
        ) : view === "secrets" ? (
          <AdminSecrets demo={demo} />
        ) : view === "notifications" ? (
          <AdminNotifications
            value={{ ...defaultSettings, ...settings }}
            onChange={setSettings}
            onSave={() => save("settings", { id: "store", value: settings })}
            busy={busy}
            demo={demo}
          />
        ) : view === "readiness" ? (
          <Readiness demo={demo} />
        ) : ["integrations", "policies"].includes(view) ? (
          <AdminSettings
            value={{ ...defaultSettings, ...settings }}
            onChange={setSettings}
            onSave={() => save("settings", { id: "store", value: settings })}
            busy={busy}
            view={view}
          />
        ) : view === "dashboard" ? (
          <AdminDashboard demo={demo} period={period} />
        ) : view === "settings" ? (
          <AdminCommerce
            key={demo ? "demo-settings" : "settings"}
            value={{ ...defaultSettings, ...settings }}
            onChange={setSettings}
            onSave={() => save("settings", { id: "store", value: settings })}
            busy={busy}
            demo={demo}
          />
        ) : ["payments"].includes(view) ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save("settings", { id: "store", value: settings });
            }}
          >
            <div className="admin-panel">
              {view === "settings" ? (
                <div className="form-grid">
                  {[
                    ["name", "Назва магазину"],
                    ["description", "SEO опис"],
                    ["email", "Контактний email"],
                    ["phone", "Телефон"],
                    ["instagram", "Посилання на Instagram"],
                    ["recipient", "Отримувач платежів"],
                    ["iban", "IBAN"],
                    ["free_shipping", "Безкоштовна доставка від, ₴"],
                  ].map(([id, label]) => (
                    <label className="field" key={id}>
                      {label}
                      <input
                        value={settings[id]}
                        type={
                          id === "free_shipping"
                            ? "number"
                            : id === "email"
                              ? "email"
                              : "text"
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [id]:
                              id === "free_shipping"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <div className="settings-row full-width">
                    <span>
                      <h3>Видимість у пошукових системах</h3>
                      <p>
                        Увімкніть, коли магазин готовий приймати замовлення.
                      </p>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.seo_visible}
                      aria-label="SEO видимість"
                      className={
                        "switch " + (settings.seo_visible ? "active" : "")
                      }
                      onClick={() =>
                        setSettings({
                          ...settings,
                          seo_visible: !settings.seo_visible,
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
                  {[
                    [
                      "np",
                      "Нова пошта",
                      "Відділення та поштомати. API ключ задається на сервері.",
                    ],
                    ["ukr", "Укрпошта", "Доставка до відділення за індексом"],
                    ["courier", "Кур’єр", "Доставка за адресою покупця"],
                    [
                      "cod",
                      "Оплата при отриманні",
                      "Готівкою або карткою у перевізника",
                    ],
                    [
                      "mono",
                      "Monopay",
                      "Потрібен токен еквайрингу. Apple Pay / Google Pay на сторінці банку.",
                    ],
                    [
                      "liqpay",
                      "LiqPay",
                      "Потрібні публічний і приватний ключі мерчанта",
                    ],
                    [
                      "bank",
                      "Оплата за IBAN",
                      "Спочатку заповніть реквізити в налаштуваннях",
                    ],
                  ].map(([id, title, desc]) => (
                    <div className="settings-row" key={id}>
                      <span>
                        <h3>{title}</h3>
                        <p>{desc}</p>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings[id]}
                        aria-label={title}
                        className={"switch " + (settings[id] ? "active" : "")}
                        onClick={() =>
                          setSettings({ ...settings, [id]: !settings[id] })
                        }
                      />
                    </div>
                  ))}
                </>
              )}
              <div className="modal-actions">
                <button className="button" disabled={busy}>
                  <Check size={16} /> Зберегти налаштування
                </button>
              </div>
            </div>
          </form>
        ) : view === "reviews" ? (
          <div className="admin-panel">
            <h2>Відгуки покупців</h2>
            {(data.reviews || []).map((r) => (
              <div className="settings-row" key={r.id}>
                <span>
                  <h3>
                    {r.name} · {r.rating}/5
                  </h3>
                  <p>{r.body}</p>
                </span>
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() =>
                    save("reviews", { id: r.id, approved: !r.approved })
                  }
                >
                  {r.approved ? "Приховати" : "Опублікувати"}
                </button>
              </div>
            ))}
            {!data.reviews?.length && (
              <p className="admin-empty">Нові відгуки з’являться тут.</p>
            )}
          </div>
        ) : (
          <div className="admin-panel">
            <div className="admin-controls">
              {view === "products" && (
                <label className="radio-option">
                  <input
                    type="checkbox"
                    checked={archive}
                    onChange={(e) => setArchive(e.target.checked)}
                  />
                  Архів
                </label>
              )}
              <input
                aria-label="Пошук у таблиці"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук за назвою, номером…"
              />
              {view === "orders" && (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Усі статуси</option>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  {(view === "products"
                    ? ["Товар", "Категорія", "Ціна", "Залишок", "Дії"]
                    : view === "orders"
                      ? ["Номер", "Покупець", "Дата", "Сума", "Статус", "Дії"]
                      : view === "categories"
                        ? ["Назва", "Батьківська категорія", "Порядок", "Дії"]
                        : view === "promocodes"
                          ? [
                              "Промокод",
                              "Знижка",
                              "Використано",
                              "Активний",
                              "Дії",
                            ]
                          : ["Назва статті", "Статус", "Посилання", "Дії"]
                  ).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {view === "products" ? (
                      <>
                        <td>
                          <Image src={r.image} alt="" width={40} height={44} />
                          {r.name}
                        </td>
                        <td>
                          {
                            data.categories.find((c) => c.id === r.category)
                              ?.name
                          }
                        </td>
                        <td>{money(r.price)}</td>
                        <td>{r.stock} шт.</td>
                      </>
                    ) : view === "orders" ? (
                      <>
                        <td>#{r.id.slice(0, 8)}</td>
                        <td>
                          {r.name} {r.last_name}
                          <small style={{ display: "block", color: "#929c89" }}>
                            {r.phone}
                          </small>
                        </td>
                        <td>
                          {new Date(r.created_at).toLocaleDateString("uk-UA")}
                        </td>
                        <td>{money(r.total)}</td>
                        <td>
                          <select
                            value={r.status}
                            disabled={busy}
                            onChange={(e) =>
                              save("orders", {
                                id: r.id,
                                status: e.target.value,
                              })
                            }
                          >
                            {statuses.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </>
                    ) : view === "categories" ? (
                      <>
                        <td>
                          {r.parent_id ? "↳ " : ""}
                          {r.name}
                        </td>
                        <td>
                          {data.categories.find((c) => c.id === r.parent_id)
                            ?.name || "—"}
                        </td>
                        <td>{r.sort_order || 0}</td>
                      </>
                    ) : view === "promocodes" ? (
                      <>
                        <td>
                          <strong>{r.code}</strong>
                        </td>
                        <td>
                          {r.type === "percent"
                            ? r.value + "%"
                            : money(r.value)}
                        </td>
                        <td>
                          {r.uses || 0}
                          {r.max_uses ? " / " + r.max_uses : ""}
                        </td>
                        <td>{r.active ? "Так" : "Ні"}</td>
                      </>
                    ) : (
                      <>
                        <td>{r.title}</td>
                        <td>
                          <span className="status">
                            {r.published ? "Опубліковано" : "Чернетка"}
                          </span>
                        </td>
                        <td>{r.slug}</td>
                      </>
                    )}
                    <td>
                      <button
                        className="icon-button"
                        aria-label={
                          view === "orders" ? "Деталі замовлення" : "Редагувати"
                        }
                        onClick={() =>
                          view === "orders"
                            ? setDetail(r)
                            : setEditor({ ...r, _existing: true })
                        }
                      >
                        <Pencil size={15} />
                      </button>
                      {view !== "orders" && (
                        <button
                          className="icon-button"
                          aria-label="Видалити"
                          onClick={() => setRemove(r)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {view === "orders" && !demo && hasMore && orders.length >= 200 && (
              <button
                className="button outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await fetch(
                      "/api/admin/orders?page=" +
                        Math.floor(orders.length / 200),
                    );
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.message);
                    setHasMore(d.length === 200);
                    setData((s) => ({
                      ...s,
                      orders: [
                        ...s.orders,
                        ...d.filter(
                          (n: Row) => !s.orders.some((o) => o.id === n.id),
                        ),
                      ],
                    }));
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Завантажити старіші замовлення
              </button>
            )}
            {!rows.length && (
              <div className="admin-empty">
                Поки що записів немає.
                {view !== "orders" &&
                  " Додайте перший за допомогою кнопки вище."}
              </div>
            )}
          </div>
        )}
        {editor && !["products", "categories"].includes(view) && (
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Редагування"
          >
            <form
              className="admin-modal-content"
              onSubmit={(e) => {
                e.preventDefault();
                save(view, editor);
              }}
            >
              <div className="drawer-heading">
                <h2>
                  {view === "products"
                    ? "Картка товару"
                    : view === "categories"
                      ? "Категорія"
                      : view === "promocodes"
                        ? "Промокод"
                        : "Стаття"}
                </h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Закрити"
                  onClick={() => setEditor(null)}
                >
                  <X />
                </button>
              </div>
              <div className="form-grid">
                {view === "products" ? (
                  <>
                    <Field
                      label="Назва"
                      value={editor.name}
                      onChange={(v) => setEditor({ ...editor, name: v })}
                    />
                    <Field
                      label="Посилання (латиницею)"
                      value={editor.slug}
                      onChange={(v) => setEditor({ ...editor, slug: v })}
                    />
                    <label className="field">
                      Категорія
                      <select
                        value={editor.category}
                        onChange={(e) =>
                          setEditor({ ...editor, category: e.target.value })
                        }
                      >
                        {data.categories.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Фасування"
                      value={editor.weight}
                      onChange={(v) => setEditor({ ...editor, weight: v })}
                    />
                    {[
                      ["price", "Ціна, ₴"],
                      ["old_price", "Стара ціна, ₴"],
                      ["stock", "Залишок, шт."],
                    ].map(([id, label]) => (
                      <Field
                        key={id}
                        label={label}
                        required={id !== "old_price"}
                        type="number"
                        value={editor[id] ?? ""}
                        onChange={(v) =>
                          setEditor({
                            ...editor,
                            [id]: v === "" ? null : Number(v),
                          })
                        }
                      />
                    ))}
                    <Field
                      label="Теги через кому"
                      value={editor.tags.join(", ")}
                      onChange={(v) =>
                        setEditor({
                          ...editor,
                          tags: v
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <label className="field full-width">
                      Опис
                      <textarea
                        rows={4}
                        value={editor.description}
                        onChange={(e) =>
                          setEditor({ ...editor, description: e.target.value })
                        }
                      />
                    </label>
                    <label className="field full-width">
                      Склад
                      <textarea
                        rows={2}
                        value={editor.ingredients}
                        onChange={(e) =>
                          setEditor({ ...editor, ingredients: e.target.value })
                        }
                      />
                    </label>
                    {[
                      ["kcal", "Калорійність"],
                      ["protein", "Білки, г"],
                      ["fat", "Жири, г"],
                      ["carbs", "Вуглеводи, г"],
                    ].map(([id, label]) => (
                      <Field
                        key={id}
                        label={label + " / 100 г"}
                        type="number"
                        value={editor.nutrition[id]}
                        onChange={(v) =>
                          setEditor({
                            ...editor,
                            nutrition: { ...editor.nutrition, [id]: Number(v) },
                          })
                        }
                      />
                    ))}
                    <AdminImage
                      label="Головне фото товару"
                      value={editor.image}
                      demo={demo}
                      disabled={busy}
                      onBusy={setBusy}
                      onMessage={setMessage}
                      onChange={(url) =>
                        setEditor((current) =>
                          current ? { ...current, image: url } : null,
                        )
                      }
                    />
                    <AdminImage
                      label="Додати фото до галереї (до 10)"
                      value=""
                      demo={demo}
                      disabled={busy}
                      onBusy={setBusy}
                      onMessage={setMessage}
                      onChange={(url) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                additional_images: [
                                  ...(current.additional_images || []),
                                  url,
                                ].slice(0, 10),
                              }
                            : null,
                        )
                      }
                    />
                    <div className="full-width">
                      <h3>Google Merchant Center</h3>
                      <p className="page-description">
                        Вкажіть фактичні ідентифікатори виробника. Експорт
                        вмикайте після перевірки фото, назви, ціни та фасування.
                      </p>
                    </div>
                    {[
                      ["brand", "Бренд виробника"],
                      ["gtin", "GTIN / штрихкод"],
                      ["mpn", "MPN / код виробника"],
                      [
                        "google_category",
                        "Google Product Category (ID або шлях)",
                      ],
                    ].map(([id, label]) => (
                      <Field
                        key={id}
                        label={label}
                        required={false}
                        value={editor[id] || ""}
                        onChange={(v) => setEditor({ ...editor, [id]: v })}
                      />
                    ))}
                    <label className="radio-option">
                      <input
                        type="checkbox"
                        checked={editor.identifier_exists !== false}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            identifier_exists: e.target.checked,
                          })
                        }
                      />
                      Виробник має ідентифікатори товару
                    </label>
                    <label className="radio-option">
                      <input
                        type="checkbox"
                        checked={!!editor.merchant_enabled}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            merchant_enabled: e.target.checked,
                          })
                        }
                      />
                      Експортувати в Google
                    </label>
                    <label className="radio-option">
                      <input
                        type="checkbox"
                        checked={editor.active !== false}
                        onChange={(e) =>
                          setEditor({ ...editor, active: e.target.checked })
                        }
                      />
                      Показувати в каталозі
                    </label>
                    <label className="field full-width">
                      Додаткові фото: URL зі Storage, по одному в рядку
                      <textarea
                        rows={3}
                        value={(editor.additional_images || []).join("\n")}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            additional_images: e.target.value
                              .split("\n")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label className="radio-option">
                      <input
                        type="checkbox"
                        checked={editor.featured}
                        onChange={(e) =>
                          setEditor({ ...editor, featured: e.target.checked })
                        }
                      />
                      Хіт продажу
                    </label>
                  </>
                ) : view === "categories" ? (
                  <>
                    <Field
                      label="Код категорії (латиницею)"
                      readOnly={!!editor._existing}
                      value={editor.id}
                      onChange={(v) => setEditor({ ...editor, id: v })}
                    />
                    <Field
                      label="Назва"
                      value={editor.name}
                      onChange={(v) => setEditor({ ...editor, name: v })}
                    />
                    <label className="field">
                      Батьківська категорія
                      <select
                        value={editor.parent_id || ""}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            parent_id: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Без батьківської категорії</option>
                        {data.categories
                          .filter((c) => c.id !== editor.id && !c.parent_id)
                          .map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Field
                      label="Порядок"
                      type="number"
                      value={editor.sort_order}
                      onChange={(v) =>
                        setEditor({ ...editor, sort_order: Number(v) })
                      }
                    />
                  </>
                ) : view === "promocodes" ? (
                  <>
                    <Field
                      label="Код"
                      value={editor.code}
                      onChange={(v) =>
                        setEditor({ ...editor, code: v.toUpperCase() })
                      }
                    />
                    <label className="field">
                      Тип знижки
                      <select
                        value={editor.type}
                        onChange={(e) =>
                          setEditor({ ...editor, type: e.target.value })
                        }
                      >
                        <option value="percent">Відсоток</option>
                        <option value="fixed">Фіксована сума</option>
                      </select>
                    </label>
                    {[
                      ["value", "Розмір знижки"],
                      ["min_order", "Мінімальна сума замовлення"],
                      ["max_uses", "Ліміт використань (необов’язково)"],
                    ].map(([id, label]) => (
                      <Field
                        key={id}
                        label={label}
                        type="number"
                        required={id !== "max_uses"}
                        value={editor[id] ?? ""}
                        onChange={(v) =>
                          setEditor({ ...editor, [id]: v ? Number(v) : null })
                        }
                      />
                    ))}
                    <Field
                      label="Діє до"
                      type="datetime-local"
                      required={false}
                      value={
                        editor.expires_at
                          ? new Date(
                              new Date(editor.expires_at).getTime() -
                                new Date(
                                  editor.expires_at,
                                ).getTimezoneOffset() *
                                  60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(v) =>
                        setEditor({
                          ...editor,
                          expires_at: v ? new Date(v).toISOString() : null,
                        })
                      }
                    />
                    <label className="radio-option">
                      <input
                        type="checkbox"
                        checked={editor.active}
                        onChange={(e) =>
                          setEditor({ ...editor, active: e.target.checked })
                        }
                      />
                      Активний
                    </label>
                  </>
                ) : (
                  <>
                    <Field
                      label="Заголовок"
                      value={editor.title}
                      onChange={(v) => setEditor({ ...editor, title: v })}
                    />
                    <Field
                      label="Посилання (латиницею)"
                      value={editor.slug}
                      onChange={(v) => setEditor({ ...editor, slug: v })}
                    />
                    <AdminImage
                      label="Обкладинка статті"
                      value={editor.image}
                      demo={demo}
                      disabled={busy}
                      onBusy={setBusy}
                      onMessage={setMessage}
                      onChange={(url) =>
                        setEditor((current) =>
                          current ? { ...current, image: url } : null,
                        )
                      }
                    />
                    <label className="field full-width">
                      Короткий опис
                      <textarea
                        value={editor.excerpt}
                        onChange={(e) =>
                          setEditor({ ...editor, excerpt: e.target.value })
                        }
                      />
                    </label>
                    <label className="field full-width">
                      Текст статті
                      <textarea
                        rows={12}
                        value={editor.content}
                        onChange={(e) =>
                          setEditor({ ...editor, content: e.target.value })
                        }
                      />
                    </label>
                    <label className="radio-option">
                      <input
                        type="checkbox"
                        checked={editor.published}
                        onChange={(e) =>
                          setEditor({ ...editor, published: e.target.checked })
                        }
                      />
                      Опублікувати
                    </label>
                  </>
                )}
              </div>
              {message && <p className="notice">{message}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button outline"
                  onClick={() => setEditor(null)}
                >
                  Скасувати
                </button>
                <button className="button" disabled={busy}>
                  {busy ? "Зберігаємо…" : "Зберегти"}
                </button>
              </div>
            </form>
          </div>
        )}
        {remove && (
          <div
            className="admin-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Підтвердити видалення"
          >
            <div className="admin-modal-content" style={{ maxWidth: 440 }}>
              <h2>Видалити запис?</h2>
              <p style={{ marginTop: 15 }}>
                {remove.name || remove.title || remove.code}
              </p>
              <p className="page-description">
                {view === "products"
                  ? "Товар буде приховано з каталогу. Історія замовлень збережеться."
                  : "Цю дію не можна скасувати."}
              </p>
              {message && <p className="notice">{message}</p>}
              <div className="modal-actions">
                <button
                  className="button outline"
                  onClick={() => setRemove(null)}
                >
                  Залишити
                </button>
                <button
                  disabled={busy}
                  className="button"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      if (!demo) {
                        const r = await fetch("/api/admin/" + view, {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: remove.id }),
                        });
                        if (!r.ok) throw new Error((await r.json()).message);
                      }
                      setData((s) => ({
                        ...s,
                        [view]:
                          view === "products"
                            ? s[view].map((r) =>
                                r.id === remove.id
                                  ? { ...r, active: false }
                                  : r,
                              )
                            : s[view].filter((r) => r.id !== remove.id),
                      }));
                      setRemove(null);
                      setMessage(
                        demo
                          ? "Видалено в демонстраційному перегляді."
                          : "Запис видалено.",
                      );
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Видалити
                </button>
              </div>
            </div>
          </div>
        )}
        {detail && (
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Деталі замовлення"
          >
            <div className="admin-modal-content">
              <div className="drawer-heading">
                <h2>Замовлення #{detail.id.slice(0, 8)}</h2>
                <button
                  className="icon-button"
                  onClick={() => setDetail(null)}
                  aria-label="Закрити"
                >
                  <X />
                </button>
              </div>
              <p>
                {detail.name} {detail.last_name}
              </p>
              <p>
                {detail.phone} · {detail.email}
              </p>
              <p>
                {detail.city}, {detail.address}
              </p>
              <p>
                Оплата: {detail.payment} · {detail.payment_status}
              </p>
              {detail.payment_review && (
                <p className="error-message">
                  Платіж після скасування. Потрібна звірка з банком і повернення
                  коштів або нове замовлення.
                </p>
              )}
              {["cod", "bank"].includes(detail.payment) &&
                detail.payment_status !== "paid" &&
                detail.payment_status !== "refunded" && (
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Кошти фактично надійшли?"))
                        void save("orders", {
                          id: detail.id,
                          payment_status: "paid",
                        });
                    }}
                  >
                    Підтвердити надходження коштів
                  </button>
                )}
              {detail.payment_status === "paid" && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Повернення вже виконане у банку? Ця кнопка лише фіксує факт, кошти не переказує.",
                      )
                    )
                      void save("orders", {
                        id: detail.id,
                        payment_status: "refunded",
                      });
                  }}
                >
                  Зафіксувати виконане повернення
                </button>
              )}
              {detail.custom_fields &&
                Object.entries(detail.custom_fields).map(([key, entry]) => (
                  <p key={key}>
                    <strong>{(entry as any).label || key}: </strong>
                    {String((entry as any).value ?? entry)}
                  </p>
                ))}
              {detail.comment && <p className="notice">{detail.comment}</p>}
              {detail.items.map((i: Row) => (
                <div className="summary-row" key={i.id}>
                  <span>
                    {i.name} × {i.quantity}
                  </span>
                  <strong>{money(i.price * i.quantity)}</strong>
                </div>
              ))}
              <div className="summary-row total">
                <strong>Разом</strong>
                <strong>{money(detail.total)}</strong>
              </div>
              <label className="field">
                Статус
                <select
                  value={detail.status}
                  onChange={(e) =>
                    setDetail({ ...detail, status: e.target.value })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {message && <p className="notice">{message}</p>}
              <Field
                label="Номер ТТН"
                value={detail.ttn || ""}
                required={false}
                onChange={(v) => setDetail({ ...detail, ttn: v })}
              />
              <div className="modal-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    save("orders", {
                      id: detail.id,
                      status: detail.status,
                      ttn: detail.ttn,
                    })
                  }
                >
                  Зберегти ТТН
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  readOnly = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        readOnly={readOnly}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
