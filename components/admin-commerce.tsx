"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Settings2,
  ShoppingBag,
  Tag,
  Globe,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { settingsSchema, type Settings } from "@/lib/store-settings";
import {
  defaultCommerce,
  formatPrice,
  type CommerceSettings,
} from "@/lib/commerce-settings";
type Props = {
  value: Settings;
  onChange: (s: Settings) => void;
  onSave: () => Promise<unknown>;
  busy: boolean;
  demo: boolean;
};
const tabs = [
  ["general", "Загальні", Settings2],
  ["format", "Формат даних", Tag],
  ["cart", "Кошик", ShoppingBag],
  ["card", "Картка товару", Tag],
  ["social", "Соцмережі", Globe],
] as const;
export default function AdminCommerce({
  value,
  onChange,
  onSave,
  busy,
  demo,
}: Props) {
  const [tab, setTab] = useState("general"),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  const baseline = useRef(JSON.stringify(value));
  const c = { ...defaultCommerce, ...value.commerce };
  const dirty = baseline.current !== JSON.stringify(value);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  const set = (key: keyof CommerceSettings, v: unknown) => {
    setSaved("");
    onChange({ ...value, commerce: { ...c, [key]: v } });
  };
  const base = (key: keyof Settings, v: unknown) => {
    setSaved("");
    onChange({ ...value, [key]: v });
  };
  const field = (key: keyof CommerceSettings, title: string, type = "text") => (
    <label className="field">
      {title}
      <input
        type={type}
        min={0}
        max={1000000}
        value={String(c[key])}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </label>
  );
  const toggle = (key: keyof CommerceSettings, title: string, desc: string) => (
    <label className="preference-row">
      <span>
        <strong>{title}</strong>
        <small>{desc}</small>
      </span>
      <input
        type="checkbox"
        checked={Boolean(c[key])}
        onChange={(e) => set(key, e.target.checked)}
      />
    </label>
  );
  const patch = (i: number, v: object) =>
    set(
      "extra_fields",
      c.extra_fields.map((f, n) => (n === i ? { ...f, ...v } : f)),
    );
  return (
    <form
      className="commerce-workspace"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const parsed = settingsSchema.safeParse(value);
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join(". "));
          return;
        }
        const result = await onSave();
        if (result) {
          baseline.current = JSON.stringify(value);
          setSaved(
            demo
              ? "Перевірено у деморежимі. Для постійного збереження підключіть БД."
              : "Збережено. Налаштування застосовано в магазині.",
          );
        }
      }}
    >
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">ВАШ МАГАЗИН</span>
          <h2>Налаштування магазину</h2>
          <p>Каталог, оформлення та взаємодія з покупцями.</p>
        </div>
        <a
          href="/catalog"
          target="_blank"
          rel="noreferrer"
          className="button outline"
        >
          <ExternalLink size={15} />
          Відкрити магазин
        </a>
      </div>
      <div className="commerce-tabs" role="tablist">
        {tabs.map(([id, title, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={tab === id ? "active" : ""}
          >
            <Icon size={16} />
            {title}
          </button>
        ))}
      </div>
      <fieldset disabled={busy} className="commerce-body">
        {tab === "general" && (
          <>
            <section className="preference-section">
              <header>
                <h3>Інформація про магазин</h3>
                <p>Контакти та назва, які бачать покупці.</p>
              </header>
              <div className="form-grid">
                {[
                  ["name", "Назва магазину"],
                  ["email", "Контактний email"],
                  ["phone", "Телефон"],
                  ["instagram", "Instagram"],
                  ["recipient", "Отримувач платежів"],
                  ["iban", "IBAN"],
                ].map(([key, title]) => (
                  <label className="field" key={key}>
                    {title}
                    <input
                      type={key === "email" ? "email" : "text"}
                      value={String(value[key as keyof Settings] || "")}
                      onChange={(e) =>
                        base(key as keyof Settings, e.target.value)
                      }
                    />
                  </label>
                ))}
                <label className="field full-width">
                  Опис магазину для пошуку
                  <textarea
                    rows={3}
                    value={value.description}
                    onChange={(e) => base("description", e.target.value)}
                  />
                </label>
              </div>
            </section>
            <section className="preference-section">
              <header>
                <h3>Вітрина та пошук</h3>
                <p>Застосовується до каталогу й сторінок категорій.</p>
              </header>
              <div className="form-grid">
                <label className="field">
                  Сортування за замовчуванням
                  <select
                    value={c.sort}
                    onChange={(e) => set("sort", e.target.value)}
                  >
                    <option value="popular">Популярні спочатку</option>
                    <option value="new">Нові спочатку</option>
                    <option value="asc">Від дешевих</option>
                    <option value="desc">Від дорогих</option>
                  </select>
                </label>
                <label className="field">
                  Товарів на сторінці
                  <select
                    value={c.page_size}
                    onChange={(e) => set("page_size", Number(e.target.value))}
                  >
                    {[12, 24, 48].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              {toggle(
                "hide_unavailable",
                "Приховувати відсутні товари",
                "Товари залишаться в адмінці та будуть доступні за прямим посиланням.",
              )}
              <label className="preference-row">
                <span>
                  <strong>Індексація пошуковими системами</strong>
                  <small>
                    Вмикайте після заповнення товарів і умов магазину.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={value.seo_visible}
                  onChange={(e) => base("seo_visible", e.target.checked)}
                />
              </label>
            </section>
          </>
        )}
        {tab === "format" && (
          <section className="preference-section">
            <header>
              <h3>Ціни та наявність</h3>
              <p>
                Валюта розрахунків — гривня (UAH). Оформлення ціни не змінює
                суму платежу.
              </p>
            </header>
            <div className="settings-preview-grid">
              <div className="form-grid">
                <label className="field">
                  Копійки
                  <select
                    value={c.price_decimals}
                    onChange={(e) => set("price_decimals", e.target.value)}
                  >
                    <option value="auto">Приховати нульові копійки</option>
                    <option value="two">Завжди два знаки</option>
                  </select>
                </label>
                <label className="field">
                  Позначення валюти
                  <select
                    value={c.price_symbol}
                    onChange={(e) => set("price_symbol", e.target.value)}
                  >
                    {["₴", "грн", "UAH"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                {field("stock_label", "Статус «у наявності»")}
                {field("soldout_label", "Статус «немає в наявності»")}
              </div>
              <aside className="settings-live-preview">
                <small>ПРИКЛАД ВІДОБРАЖЕННЯ</small>
                <span className="preview-product-icon">🌿</span>
                <span className="preview-stock">{c.stock_label}</span>
                <h3>Арахісова паста</h3>
                <p>250 г · Натуральний склад</p>
                <strong>{formatPrice(1250, c)}</strong>
              </aside>
            </div>
          </section>
        )}
        {tab === "card" && (
          <section className="preference-section">
            <header>
              <h3>Картка в каталозі</h3>
              <p>Налаштуйте дію кнопки та інформацію про товар.</p>
            </header>
            <div className="settings-preview-grid">
              <div>
                {[
                  ["drawer", "Додати товар і відкрити кошик"],
                  ["continue", "Додати товар і продовжити покупки"],
                  ["product", "Перейти до сторінки товару"],
                ].map(([id, label]) => (
                  <label className="radio-option" key={id}>
                    <input
                      type="radio"
                      name="card-action"
                      value={id}
                      checked={c.card_action === id}
                      onChange={() => set("card_action", id)}
                    />
                    {label}
                  </label>
                ))}
                {toggle(
                  "show_badges",
                  "Показувати лейбли",
                  "Акція, новинка або власний підпис із картки товару.",
                )}
                {toggle(
                  "show_sku",
                  "Показувати артикул",
                  "Артикул відображається на сторінці товару.",
                )}
                <label className="field">
                  Розташування лейбла
                  <select
                    value={c.badge_position}
                    onChange={(e) => set("badge_position", e.target.value)}
                  >
                    <option value="left">Ліворуч</option>
                    <option value="right">Праворуч</option>
                  </select>
                </label>
              </div>
              <aside className="settings-live-preview">
                <small>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</small>
                <div className="preview-card-image">
                  {c.show_badges && (
                    <span style={{ [c.badge_position]: 10 }}>Новинка</span>
                  )}
                  🌿
                </div>
                <h3>Арахісова паста</h3>
                <strong>{formatPrice(189, c)}</strong>
                <div className="preview-cart-button">
                  {c.card_action === "product" ? "Докладніше" : "У кошик"}
                </div>
              </aside>
            </div>
          </section>
        )}
        {tab === "cart" && (
          <>
            <section className="preference-section">
              <header>
                <h3>Оформлення замовлення</h3>
                <p>
                  Мінімальна сума рахується після знижки, без доставки. Правило
                  перевіряється сервером.
                </p>
              </header>
              <div className="form-grid">
                {field(
                  "minimum_order",
                  "Мінімальна сума замовлення, ₴",
                  "number",
                )}
                <label className="field">
                  Безкоштовна доставка від, ₴
                  <input
                    type="number"
                    min={0}
                    value={value.free_shipping}
                    onChange={(e) =>
                      base("free_shipping", Number(e.target.value))
                    }
                  />
                </label>
                {field("checkout_button", "Текст кнопки оформлення")}
                {field("comment_label", "Назва поля коментаря")}
              </div>
              {toggle(
                "comment_enabled",
                "Коментар покупця",
                "Додаткові побажання до замовлення.",
              )}
            </section>
            <section className="preference-section">
              <header>
                <h3>Додаткові поля</h3>
                <p>
                  Ім’я, прізвище, телефон, email і адреса залишаються
                  обов’язковими для обробки замовлення. Власні поля з’являться в
                  оформленні та деталях замовлення.
                </p>
              </header>
              {c.extra_fields.map((f, i) => (
                <div className="custom-field-editor" key={f.id}>
                  <div className="custom-field-top">
                    <span>Поле {i + 1}</span>
                    <div>
                      <button
                        type="button"
                        aria-label="Перемістити вище"
                        disabled={!i}
                        onClick={() => {
                          const a = [...c.extra_fields];
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          set("extra_fields", a);
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Перемістити нижче"
                        disabled={i === c.extra_fields.length - 1}
                        onClick={() => {
                          const a = [...c.extra_fields];
                          [a[i + 1], a[i]] = [a[i], a[i + 1]];
                          set("extra_fields", a);
                        }}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Видалити поле"
                        onClick={() =>
                          set(
                            "extra_fields",
                            c.extra_fields.filter((_, n) => n !== i),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      Назва
                      <input
                        value={f.label}
                        onChange={(e) => patch(i, { label: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      Тип
                      <select
                        value={f.type}
                        onChange={(e) => patch(i, { type: e.target.value })}
                      >
                        <option value="text">Короткий текст</option>
                        <option value="textarea">Довгий текст</option>
                        <option value="select">Список</option>
                        <option value="checkbox">Прапорець</option>
                      </select>
                    </label>
                    {f.type === "select" && (
                      <label className="field full-width">
                        Варіанти — по одному в рядку
                        <textarea
                          value={f.options.join("\n")}
                          onChange={(e) =>
                            patch(i, { options: e.target.value.split("\n") })
                          }
                        />
                      </label>
                    )}
                  </div>
                  <label className="radio-option">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => patch(i, { required: e.target.checked })}
                    />
                    Обов’язкове поле
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="button outline"
                disabled={c.extra_fields.length >= 8}
                onClick={() =>
                  set("extra_fields", [
                    ...c.extra_fields,
                    {
                      id: "field_" + crypto.randomUUID().slice(0, 8),
                      label: "Нове поле",
                      type: "text",
                      required: false,
                      options: [],
                    },
                  ])
                }
              >
                <Plus size={16} />
                Додати поле
              </button>
              <small> До 8 додаткових полів.</small>
            </section>
          </>
        )}
        {tab === "social" && (
          <section className="preference-section">
            <header>
              <h3>Контакти й соціальні мережі</h3>
              <p>
                Посилання та години роботи публікуються внизу кожної сторінки.
              </p>
            </header>
            {field("working_hours", "Години роботи")}
            {c.social_links.map((l, i) => (
              <div className="custom-field-editor" key={i}>
                <div className="form-grid">
                  <label className="field">
                    Назва
                    <input
                      value={l.label}
                      onChange={(e) =>
                        set(
                          "social_links",
                          c.social_links.map((v, n) =>
                            n === i ? { ...v, label: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    HTTPS-посилання
                    <input
                      type="url"
                      value={l.href}
                      placeholder="https://t.me/your_shop"
                      onChange={(e) =>
                        set(
                          "social_links",
                          c.social_links.map((v, n) =>
                            n === i ? { ...v, href: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="custom-field-top">
                  <label className="radio-option">
                    <input
                      type="checkbox"
                      checked={l.nofollow}
                      onChange={(e) =>
                        set(
                          "social_links",
                          c.social_links.map((v, n) =>
                            n === i ? { ...v, nofollow: e.target.checked } : v,
                          ),
                        )
                      }
                    />
                    nofollow
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      set(
                        "social_links",
                        c.social_links.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <Trash2 size={16} />
                    Видалити
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button outline"
              disabled={c.social_links.length >= 10}
              onClick={() =>
                set("social_links", [
                  ...c.social_links,
                  { label: "Telegram", href: "", nofollow: false },
                ])
              }
            >
              <Plus size={16} />
              Додати посилання
            </button>
          </section>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="notice">
          {saved}
        </p>
      )}
      <div className="commerce-savebar">
        <span className={dirty ? "unsaved" : ""}>
          {dirty ? "Є незбережені зміни" : "Усі зміни збережені"}
          {demo ? " · Деморежим" : ""}
        </span>
        <div>
          <button
            type="button"
            className="button outline"
            disabled={!dirty || busy}
            onClick={() => {
              onChange(JSON.parse(baseline.current));
              setError("");
              setSaved("");
            }}
          >
            <RotateCcw size={15} />
            Скасувати зміни
          </button>
          <button className="button" disabled={busy || !dirty}>
            <Check size={16} />
            {busy ? "Збереження…" : "Зберегти"}
          </button>
        </div>
      </div>
    </form>
  );
}
