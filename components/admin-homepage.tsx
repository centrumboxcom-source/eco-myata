"use client";
import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  ExternalLink,
} from "lucide-react";
import {
  defaultHome,
  homeSchema,
  sectionNames,
  type HomeContent,
} from "@/lib/content-settings";
import AdminImage from "./admin-image";
import HomeHero from "./home-hero";
type Row = Record<string, any>;
export default function Homepage({
  settings,
  products,
  demo,
  busy,
  onSave,
}: {
  settings: Row;
  products: Row[];
  demo: boolean;
  busy: boolean;
  onSave: (v: Row) => Promise<boolean | undefined>;
}) {
  const [content, setContent] = useState<HomeContent>(() =>
    structuredClone(
      settings.homepage_draft || settings.homepage || defaultHome,
    ),
  );
  const [tab, setTab] = useState("banners"),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    [preview, setPreview] = useState(false);
  const set = (key: keyof HomeContent, value: any) =>
    setContent((s) => ({ ...s, [key]: value }));
  const locked = busy || uploading;
  async function save(publish: boolean) {
    const p = homeSchema.safeParse(content);
    if (!p.success) {
      setError(
        p.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      );
      return;
    }
    const ok = await onSave({
      ...settings,
      homepage_draft: p.data,
      ...(publish ? { homepage: p.data } : {}),
    });
    setError(
      ok
        ? publish
          ? "Опубліковано. Оновіть головну сторінку."
          : "Чернетку збережено. Вітрина ще не змінена."
        : "Не вдалося зберегти.",
    );
  }
  const banner = (
    b: HomeContent["banners"][number],
    onChange: (b: HomeContent["banners"][number]) => void,
  ) => (
    <div className="cms-banner-fields">
      <label className="check-field">
        <input
          type="checkbox"
          checked={b.enabled}
          onChange={(e) => onChange({ ...b, enabled: e.target.checked })}
        />{" "}
        Показувати
      </label>
      {[
        ["eyebrow", "Надзаголовок"],
        ["title", "Заголовок"],
        ["text", "Текст"],
        ["button", "Текст кнопки"],
        ["href", "Адреса переходу"],
      ].map(([key, label]) => (
        <label className="field" key={key}>
          {label}
          {key === "title" || key === "text" ? (
            <textarea
              rows={key === "text" ? 3 : 2}
              value={b[key as "title"]}
              onChange={(e) => onChange({ ...b, [key]: e.target.value })}
            />
          ) : (
            <input
              value={b[key as "href"]}
              onChange={(e) => onChange({ ...b, [key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <AdminImage
        label="Зображення банера"
        value={b.image}
        demo={demo}
        disabled={locked}
        onBusy={setUploading}
        onMessage={setError}
        onChange={(image) => onChange({ ...b, image })}
      />
      <AdminImage
        label="Окреме зображення для телефона (необов’язково)"
        value={b.mobile_image}
        demo={demo}
        disabled={locked}
        onBusy={setUploading}
        onMessage={setError}
        onChange={(mobile_image) => onChange({ ...b, mobile_image })}
      />
      {b.mobile_image && (
        <button
          type="button"
          onClick={() => onChange({ ...b, mobile_image: "" })}
        >
          Використати спільне фото на телефоні
        </button>
      )}
    </div>
  );
  return (
    <div className="catalog-workspace">
      <header className="workspace-header">
        <h2>Головна сторінка</h2>
        <button type="button" onClick={() => setPreview(!preview)}>
          {preview ? "Закрити перегляд" : "Переглянути банери"}
        </button>
        <a href="/" target="_blank" rel="noreferrer">
          Сайт <ExternalLink size={15} />
        </a>
      </header>
      <p className="workspace-meta">
        Збережіть чернетку для продовження роботи або опублікуйте зміни на
        вітрині.
      </p>
      <nav className="editor-tabs">
        {[
          ["banners", "Банери"],
          ["sections", "Блоки та порядок"],
          ["texts", "Тексти"],
          ["navigation", "Меню та футер"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {preview && (
        <div className="cms-preview">
          <HomeHero banners={content.banners} />
        </div>
      )}
      {tab === "banners" && (
        <section className="editor-section">
          {content.banners.map((b, i) => (
            <details key={b.id} className="cms-banner" open={i === 0}>
              <summary>
                Банер {i + 1} · {b.title.split("\n")[0]}{" "}
                {b.enabled ? "" : "(приховано)"}
              </summary>
              {banner(b, (next) =>
                set(
                  "banners",
                  content.banners.map((x, n) => (n === i ? next : x)),
                ),
              )}
              <div className="row-actions">
                <button
                  disabled={!i}
                  onClick={() => {
                    const a = [...content.banners];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    set("banners", a);
                  }}
                >
                  <ChevronUp size={16} /> Вище
                </button>
                <button
                  disabled={i === content.banners.length - 1}
                  onClick={() => {
                    const a = [...content.banners];
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    set("banners", a);
                  }}
                >
                  <ChevronDown size={16} /> Нижче
                </button>
                <button
                  disabled={content.banners.length === 1}
                  onClick={() =>
                    set(
                      "banners",
                      content.banners.filter((_, n) => n !== i),
                    )
                  }
                >
                  <Trash2 size={16} /> Прибрати
                </button>
              </div>
            </details>
          ))}
          <button
            className="button outline"
            disabled={content.banners.length >= 6}
            onClick={() =>
              set("banners", [
                ...content.banners,
                {
                  ...defaultHome.banners[0],
                  id: crypto.randomUUID(),
                  enabled: false,
                  title: "Новий банер",
                },
              ])
            }
          >
            <Plus size={16} /> Додати банер
          </button>
        </section>
      )}
      {tab === "sections" && (
        <section className="editor-section">
          {content.sections.map((s, i) => (
            <div className="cms-section-row" key={s.id}>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) =>
                    set(
                      "sections",
                      content.sections.map((x, n) =>
                        n === i ? { ...x, enabled: e.target.checked } : x,
                      ),
                    )
                  }
                />
                {sectionNames[s.id]}
              </label>
              <div>
                <button
                  disabled={!i}
                  onClick={() => {
                    const a = [...content.sections];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    set("sections", a);
                  }}
                  aria-label="Підняти блок"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  disabled={i === content.sections.length - 1}
                  onClick={() => {
                    const a = [...content.sections];
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    set("sections", a);
                  }}
                  aria-label="Опустити блок"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>
          ))}
          <h3>Добірка товарів</h3>
          <label className="field">
            Кількість
            <input
              type="number"
              min={1}
              max={20}
              value={content.product_count}
              onChange={(e) => set("product_count", Number(e.target.value))}
            />
          </label>
          <p className="field-help">
            Якщо нічого не обрано, показуються товари з позначкою «Хіт продажу».
          </p>
          <div className="product-picker">
            {products
              .filter((p) => p.active !== false)
              .map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={content.product_ids.includes(p.id)}
                    onChange={(e) =>
                      set(
                        "product_ids",
                        e.target.checked
                          ? [...content.product_ids, p.id]
                          : content.product_ids.filter((id) => id !== p.id),
                      )
                    }
                  />
                  {p.name}
                </label>
              ))}
          </div>
        </section>
      )}
      {tab === "texts" && (
        <section className="editor-section">
          {[
            ["categories_title", "Заголовок категорій"],
            ["products_title", "Заголовок добірки"],
            ["about_title", "Заголовок «Про нас»"],
            ["about_text", "Текст «Про нас»"],
            ["blog_title", "Заголовок блогу"],
            ["reviews_title", "Заголовок відгуків"],
            ["instagram_title", "Заголовок Instagram"],
            ["newsletter_title", "Заголовок підписки"],
            ["newsletter_text", "Текст підписки"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <textarea
                rows={key === "about_text" ? 6 : 2}
                value={content[key as "about_text"]}
                onChange={(e) => set(key as keyof HomeContent, e.target.value)}
              />
            </label>
          ))}
          <h3>Переваги магазину</h3>
          {content.benefits.map((b, i) => (
            <div className="form-grid" key={i}>
              <label className="field">
                Назва
                <input
                  value={b.title}
                  onChange={(e) =>
                    set(
                      "benefits",
                      content.benefits.map((x, n) =>
                        n === i ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                Опис
                <input
                  value={b.text}
                  onChange={(e) =>
                    set(
                      "benefits",
                      content.benefits.map((x, n) =>
                        n === i ? { ...x, text: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <h3>Промоблок</h3>
          {banner(content.promo, (b) => set("promo", b))}
        </section>
      )}
      {tab === "navigation" && (
        <section className="editor-section">
          <label className="field">
            Підпис під логотипом
            <input
              value={content.tagline}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={content.announcement_enabled}
              onChange={(e) => set("announcement_enabled", e.target.checked)}
            />{" "}
            Показувати верхню смугу
          </label>
          <label className="field">
            Текст смуги
            <input
              value={content.announcement}
              onChange={(e) => set("announcement", e.target.value)}
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={content.newsletter_enabled}
              onChange={(e) => set("newsletter_enabled", e.target.checked)}
            />{" "}
            Показувати форму підписки
          </label>
          {(["navigation", "footer_links"] as const).map((key) => (
            <div className="editor-section" key={key}>
              <h3>
                {key === "navigation" ? "Головне меню" : "Посилання футера"}
              </h3>
              {content[key].map((l, i) => (
                <div className="attribute-row" key={i}>
                  <input
                    aria-label="Текст посилання"
                    value={l.label}
                    onChange={(e) =>
                      set(
                        key,
                        content[key].map((x, n) =>
                          n === i ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="Адреса посилання"
                    value={l.href}
                    onChange={(e) =>
                      set(
                        key,
                        content[key].map((x, n) =>
                          n === i ? { ...x, href: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <button
                    className="icon-button"
                    onClick={() =>
                      set(
                        key,
                        content[key].filter((_, n) => n !== i),
                      )
                    }
                    aria-label="Прибрати посилання"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                className="button outline"
                onClick={() =>
                  set(key, [
                    ...content[key],
                    { label: "Нова сторінка", href: "/catalog" },
                  ])
                }
              >
                <Plus size={15} /> Додати посилання
              </button>
            </div>
          ))}
        </section>
      )}
      <footer className="editor-savebar">
        <span role="status">{error}</span>
        <button
          className="button outline"
          disabled={locked}
          onClick={() => save(false)}
        >
          <Save size={16} /> Зберегти чернетку
        </button>
        <button className="button" disabled={locked} onClick={() => save(true)}>
          Опублікувати зміни
        </button>
      </footer>
    </div>
  );
}
