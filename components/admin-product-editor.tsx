"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { productExtras, slugify } from "@/lib/product-admin";
import { productSchema } from "@/lib/validation";
import { money } from "@/lib/data";
import AdminImage from "./admin-image";
import TextEditor from "./text-editor";
type Row = Record<string, any>;
type Props = {
  value: Row;
  categories: Row[];
  products: Row[];
  demo: boolean;
  busy: boolean;
  message: string;
  origin: string;
  onChange: (v: Row) => void;
  onSave: (v: Row) => Promise<boolean | undefined>;
  onClose: () => void;
  onOpen: (v: Row) => void;
  onVariant: (v: Row) => void;
  onDuplicate: (v: Row) => void;
};
export default function ProductEditor({
  value,
  categories,
  products,
  demo,
  busy,
  message,
  origin,
  onChange,
  onSave,
  onClose,
  onOpen,
  onVariant,
  onDuplicate,
}: Props) {
  const p: Row = {
    additional_images: [],
    ...productExtras.parse({}),
    ...value,
  };
  const [tab, setTab] = useState("general"),
    [localError, setLocalError] = useState(""),
    [uploading, setUploading] = useState(false),
    [lookup, setLookup] = useState("");
  const initial = useRef(JSON.stringify(value));
  const dirty = initial.current !== JSON.stringify(value);
  const set = (k: string, v: any) => onChange({ ...p, [k]: v });
  const locked = busy || uploading;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const media = [p.image, ...p.additional_images].filter(Boolean);
  const changeMedia = (images: string[]) =>
    onChange({
      ...p,
      image: images[0] || "",
      additional_images: images.slice(1),
    });
  const variants = products.filter(
    (x) =>
      x.id !== p.id && p.variant_group && x.variant_group === p.variant_group,
  );
  const input = (key: string, label: string, type = "text", max?: number) => (
    <label className="field" key={key}>
      {label}
      <input
        type={type}
        value={p[key] ?? ""}
        maxLength={max}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? 0 : undefined}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </label>
  );
  return (
    <form
      className="catalog-workspace"
      onSubmit={async (e) => {
        e.preventDefault();
        const result = productSchema.safeParse(p);
        if (!result.success) {
          setLocalError(
            result.error.issues
              .map((i) => i.path.join(".") + ": " + i.message)
              .join("; "),
          );
          return;
        }
        setLocalError("");
        await onSave(result.data);
      }}
    >
      <header className="workspace-header">
        <button type="button" className="text-button" onClick={onClose}>
          <ArrowLeft size={18} /> Товари
        </button>
        <span>/ {p.name || "Новий товар"}</span>
        <div className="workspace-header-actions">
          {p.slug &&
            p.active !== false &&
            products.some((x) => x.id === p.id) && (
              <a href={"/product/" + p.slug} target="_blank" rel="noreferrer">
                Сторінка магазину <ExternalLink size={15} />
              </a>
            )}
          <button
            type="button"
            title="Дублювати товар"
            className="icon-button"
            disabled={locked}
            onClick={() => onDuplicate(p)}
          >
            <Copy size={18} />
          </button>
        </div>
      </header>
      <p className="workspace-meta">
        {p.created_at
          ? "Створено: " + new Date(p.created_at).toLocaleDateString("uk-UA")
          : "Новий товар"}
        {p.updated_at
          ? " · Змінено: " + new Date(p.updated_at).toLocaleString("uk-UA")
          : ""}
      </p>
      <fieldset
        disabled={locked}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <div className="product-editor-grid">
          <div className="editor-main">
            <nav className="editor-tabs">
              {[
                ["general", "Загальні"],
                ["seo", "SEO"],
                ["related", "Схожі товари"],
                ["variants", "Параметри товару"],
                ["merchant", "Google Merchant"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "general" && (
              <>
                <section className="editor-section">
                  <div className="media-grid">
                    {media.map((src: string, i: number) => (
                      <div className="media-tile" key={src}>
                        <Image
                          src={src}
                          alt={"Фото " + (i + 1)}
                          width={120}
                          height={120}
                        />
                        <small>
                          {i === 0 ? "Головне фото" : "Фото " + (i + 1)}
                        </small>
                        <div>
                          {i > 0 && (
                            <button
                              type="button"
                              title="Перемістити вперед"
                              onClick={() => {
                                const a = [...media];
                                [a[i - 1], a[i]] = [a[i], a[i - 1]];
                                changeMedia(a);
                              }}
                            >
                              <ChevronUp size={14} />
                            </button>
                          )}
                          {i < media.length - 1 && (
                            <button
                              type="button"
                              title="Перемістити назад"
                              onClick={() => {
                                const a = [...media];
                                [a[i + 1], a[i]] = [a[i], a[i + 1]];
                                changeMedia(a);
                              }}
                            >
                              <ChevronDown size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Прибрати фото"
                            onClick={() =>
                              changeMedia(
                                media.filter((_: string, n: number) => n !== i),
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {media.length < 11 && (
                    <AdminImage
                      label="Додати медіафайл"
                      value=""
                      demo={demo}
                      disabled={locked}
                      onBusy={setUploading}
                      onMessage={setLocalError}
                      onChange={(url) => changeMedia([...media, url])}
                    />
                  )}
                  <label className="field">
                    Назва товару
                    <input
                      value={p.name}
                      maxLength={160}
                      onChange={(e) =>
                        onChange({
                          ...p,
                          name: e.target.value,
                          ...(!products.some((x) => x.id === p.id) &&
                          (!p.slug || p.slug === slugify(p.name))
                            ? { slug: slugify(e.target.value) }
                            : {}),
                        })
                      }
                    />
                  </label>
                  <div className="form-grid">
                    {input("sku", "Артикул")}
                    <label className="field">
                      Код товару
                      <input value={p.id} readOnly />
                    </label>
                  </div>
                  <label className="field">Опис</label>
                  <TextEditor
                    value={p.description || ""}
                    onChange={(v) => set("description", v)}
                  />
                </section>
                <section className="editor-section">
                  <h3>Категорії</h3>
                  <label className="field">
                    Головна категорія
                    <select
                      value={p.category}
                      onChange={(e) => set("category", e.target.value)}
                    >
                      <option value="">Оберіть категорію</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="category-checks">
                    {categories
                      .filter((c) => c.id !== p.category)
                      .map((c) => (
                        <label key={c.id}>
                          <input
                            type="checkbox"
                            checked={p.category_ids.includes(c.id)}
                            onChange={(e) =>
                              set(
                                "category_ids",
                                e.target.checked
                                  ? [...p.category_ids, c.id]
                                  : p.category_ids.filter(
                                      (id: string) => id !== c.id,
                                    ),
                              )
                            }
                          />
                          {c.name}
                        </label>
                      ))}
                  </div>
                </section>
                <section className="editor-section">
                  <div className="editor-section-heading">
                    <h3>Атрибути</h3>
                    <button
                      type="button"
                      className="button outline"
                      onClick={() =>
                        set("attributes", [
                          ...p.attributes,
                          { name: "", value: "" },
                        ])
                      }
                      disabled={p.attributes.length >= 30}
                    >
                      <Plus size={15} /> Додати атрибут
                    </button>
                  </div>
                  {!p.attributes.length && (
                    <div className="editor-empty">
                      Додайте країну походження, термін придатності, тип
                      паковання чи інші характеристики.
                    </div>
                  )}
                  {p.attributes.map((a: Row, i: number) => (
                    <div className="attribute-row" key={i}>
                      <input
                        placeholder="Назва характеристики"
                        value={a.name}
                        onChange={(e) =>
                          set(
                            "attributes",
                            p.attributes.map((x: Row, n: number) =>
                              n === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <input
                        placeholder="Значення"
                        value={a.value}
                        onChange={(e) =>
                          set(
                            "attributes",
                            p.attributes.map((x: Row, n: number) =>
                              n === i ? { ...x, value: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        title="Видалити атрибут"
                        onClick={() =>
                          set(
                            "attributes",
                            p.attributes.filter(
                              (_: unknown, n: number) => n !== i,
                            ),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </section>
                <section className="editor-section">
                  <h3>Склад і харчова цінність</h3>
                  {input("weight", "Фасування / вага")}
                  <label className="field">
                    Склад та алергени
                    <textarea
                      value={p.ingredients || ""}
                      onChange={(e) => set("ingredients", e.target.value)}
                      rows={3}
                    />
                  </label>
                  <div className="form-grid">
                    {[
                      ["kcal", "Ккал"],
                      ["protein", "Білки, г"],
                      ["fat", "Жири, г"],
                      ["carbs", "Вуглеводи, г"],
                    ].map(([key, label]) => (
                      <label className="field" key={key}>
                        {label} / 100 г
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={p.nutrition?.[key] ?? 0}
                          onChange={(e) =>
                            set("nutrition", {
                              ...p.nutrition,
                              [key]: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label className="field">
                    Теги (через кому)
                    <input
                      defaultValue={(p.tags || []).join(", ")}
                      onBlur={(e) =>
                        set(
                          "tags",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </label>
                  {input("badge", "Лейбл на картці товару", "text", 40)}
                </section>
                <section className="editor-section">
                  <h3>Вкладення</h3>
                  <p className="field-help">
                    Публічні PDF: сертифікати, інструкції або специфікації. До
                    10 МБ.
                  </p>
                  {p.attachments.map((a: Row, i: number) => (
                    <div className="attribute-row" key={a.url}>
                      <input
                        value={a.name}
                        aria-label="Назва документа"
                        onChange={(e) =>
                          set(
                            "attachments",
                            p.attachments.map((x: Row, n: number) =>
                              n === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <a href={a.url} target="_blank" rel="noreferrer">
                        Переглянути PDF
                      </a>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          set(
                            "attachments",
                            p.attachments.filter(
                              (_: unknown, n: number) => n !== i,
                            ),
                          )
                        }
                        aria-label="Прибрати документ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="file"
                    accept="application/pdf"
                    disabled={locked || p.attachments.length >= 10}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (demo) {
                        setLocalError("Для PDF підключіть Supabase.");
                        return;
                      }
                      setUploading(true);
                      try {
                        const body = new FormData();
                        body.set("file", f);
                        body.set("kind", "document");
                        const r = await fetch("/api/admin/upload", {
                          method: "POST",
                          body,
                        });
                        const d = await r.json();
                        if (!r.ok) throw Error(d.message);
                        set("attachments", [
                          ...p.attachments,
                          { name: f.name, url: d.url },
                        ]);
                      } catch (e) {
                        setLocalError((e as Error).message);
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </section>
              </>
            )}
            {tab === "seo" && (
              <section className="editor-section">
                <h3>Попередній перегляд у пошуку</h3>
                <div className="seo-preview">
                  <small>
                    {origin}/product/{p.slug}
                  </small>
                  <h3>{p.seo_title || p.name || "Назва товару"}</h3>
                  <p>
                    {p.seo_description ||
                      p.description?.slice(0, 160) ||
                      "Опис сторінки товару"}
                  </p>
                </div>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.noindex}
                    onChange={(e) => set("noindex", e.target.checked)}
                  />{" "}
                  Заборонити індексацію сторінки
                </label>
                {input(
                  "seo_title",
                  "Заголовок сторінки (до 70 символів)",
                  "text",
                  70,
                )}
                <label className="field">
                  Опис сторінки ({p.seo_description.length}/320)
                  <textarea
                    rows={4}
                    maxLength={320}
                    value={p.seo_description}
                    onChange={(e) => set("seo_description", e.target.value)}
                  />
                </label>
                {input("slug", "URL товару (латиницею)", "text", 150)}
                <small className="field-help">
                  Попереднє посилання автоматично перенаправлятиме на нове після
                  збереження.
                </small>
                {input(
                  "search_keywords",
                  "Ключові слова для пошуку в магазині",
                  "text",
                  255,
                )}
              </section>
            )}
            {tab === "related" && (
              <section className="editor-section">
                <label className="field">
                  Показ схожих товарів
                  <select
                    value={p.related_mode}
                    onChange={(e) => set("related_mode", e.target.value)}
                  >
                    <option value="auto">Автоматично за категорією</option>
                    <option value="manual">Обрати вручну</option>
                    <option value="off">Не показувати</option>
                  </select>
                </label>
                {p.related_mode !== "off" && (
                  <>
                    {input("related_limit", "Кількість товарів", "number")}
                    {p.related_mode === "auto" ? (
                      <label className="field">
                        Категорія рекомендацій
                        <select
                          value={p.related_category}
                          onChange={(e) =>
                            set("related_category", e.target.value)
                          }
                        >
                          <option value="">
                            Головна категорія цього товару
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        <input
                          placeholder="Пошук товару за назвою або артикулом"
                          value={lookup}
                          onChange={(e) => setLookup(e.target.value)}
                        />
                        <div className="product-picker">
                          {products
                            .filter(
                              (x) =>
                                x.id !== p.id &&
                                x.active !== false &&
                                (x.name + " " + (x.sku || ""))
                                  .toLowerCase()
                                  .includes(lookup.toLowerCase()),
                            )
                            .map((x) => (
                              <label key={x.id}>
                                <input
                                  type="checkbox"
                                  checked={p.related_ids.includes(x.id)}
                                  onChange={(e) =>
                                    set(
                                      "related_ids",
                                      e.target.checked
                                        ? [...p.related_ids, x.id].slice(0, 12)
                                        : p.related_ids.filter(
                                            (id: string) => id !== x.id,
                                          ),
                                    )
                                  }
                                />
                                <Image
                                  src={x.image}
                                  alt=""
                                  width={40}
                                  height={40}
                                />
                                <span>
                                  {x.name}
                                  <small>{money(x.price)}</small>
                                </span>
                              </label>
                            ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            )}
            {tab === "variants" && (
              <section className="editor-section">
                <h3>Параметри товару</h3>
                <p className="field-help">
                  Фасування, смак або розмір — окремі варіанти з власним
                  артикулом, ціною, фото та запасами. Покупець перемикає їх на
                  сторінці товару.
                </p>
                {input(
                  "variant_label",
                  "Назва цього варіанта (наприклад, 200 г / Класична)",
                )}
                {input("variant_group", "Група варіантів")}
                <p className="field-help">
                  Однаковий код групи об’єднує товари. Код групи можна
                  скопіювати до вже наявного товару.
                </p>
                <button
                  type="button"
                  disabled={locked}
                  className="button"
                  onClick={() => onVariant(p)}
                >
                  <Plus size={16} /> Зберегти й додати варіант
                </button>
                <div className="variant-list">
                  {[p, ...variants].map((x) => (
                    <div key={x.id}>
                      <span>
                        {x.variant_label || x.weight || x.name}
                        <small>{x.sku || "Без артикула"}</small>
                      </span>
                      <span>{money(x.price)}</span>
                      <span>
                        {x.track_stock === false
                          ? "Без обліку"
                          : x.stock + " шт."}
                      </span>
                      {x.id === p.id ? (
                        <small>Поточний</small>
                      ) : (
                        <button type="button" onClick={() => onOpen(x)}>
                          Редагувати
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "merchant" && (
              <section className="editor-section">
                <h3>Google Merchant Center</h3>
                {[
                  ["brand", "Бренд"],
                  ["gtin", "GTIN / штрихкод"],
                  ["mpn", "MPN / код виробника"],
                  ["google_category", "Google Product Category"],
                ].map(([key, label]) => input(key, label))}
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.identifier_exists !== false}
                    onChange={(e) => set("identifier_exists", e.target.checked)}
                  />{" "}
                  Виробник має ідентифікатори
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.merchant_enabled}
                    onChange={(e) => set("merchant_enabled", e.target.checked)}
                  />{" "}
                  Експортувати в Merchant Center
                </label>
                <p className="field-help">
                  Для експорту потрібні фактичні ідентифікатори, ціна, опис і
                  фото. Товар із забороненою індексацією не потрапить до фіда.
                </p>
              </section>
            )}
          </div>
          <aside className="editor-aside">
            <div className="editor-aside-card">
              <label className="field">
                Видимість
                <select
                  value={p.active === false ? "draft" : "published"}
                  onChange={(e) =>
                    set("active", e.target.value === "published")
                  }
                >
                  <option value="draft">Чернетка</option>
                  <option value="published">Опубліковано</option>
                </select>
              </label>
              {input("price", "Ціна, ₴", "number")}
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={p.old_price !== null && p.old_price !== undefined}
                  onChange={(e) =>
                    set("old_price", e.target.checked ? p.price : null)
                  }
                />{" "}
                Знижка
              </label>
              {p.old_price != null &&
                input("old_price", "Ціна до знижки, ₴", "number")}
              <h4>Запаси</h4>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={p.track_stock}
                  onChange={(e) => set("track_stock", e.target.checked)}
                />{" "}
                Відстежувати запаси
              </label>
              {p.track_stock && input("stock", "Кількість на складі", "number")}
              <label className="field">
                Наявність
                <select
                  value={p.available ? "yes" : "no"}
                  onChange={(e) => set("available", e.target.value === "yes")}
                >
                  <option value="yes">Доступний для продажу</option>
                  <option value="no">Тимчасово недоступний</option>
                </select>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={p.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />{" "}
                Хіт продажу
              </label>
            </div>
            <div className="editor-aside-card">
              <label className="field">
                Примітки до товару
                <textarea
                  rows={5}
                  placeholder="Бачать лише адміністратори"
                  value={p.internal_note}
                  onChange={(e) => set("internal_note", e.target.value)}
                />
              </label>
              {input("tax_codes", "Коди податків / обліку")}
              <small className="field-help">
                Внутрішні дані. Не змінюють розрахунок податків чи ціну.
              </small>
            </div>
          </aside>
        </div>
      </fieldset>
      <footer className="editor-savebar">
        <span>
          {locked
            ? "Зачекайте…"
            : dirty
              ? "Є незбережені зміни"
              : "Усі зміни збережені"}
          {(localError || message) && (
            <small role="status">{localError || message}</small>
          )}
        </span>
        <button
          type="button"
          disabled={locked}
          className="button outline"
          onClick={onClose}
        >
          Закрити
        </button>
        <button className="button" disabled={locked}>
          <Check size={16} /> Зберегти
        </button>
      </footer>
    </form>
  );
}
