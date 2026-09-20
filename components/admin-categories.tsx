"use client";
import { useState } from "react";
import {
  ChevronRight,
  Folder,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { categoryBranch, categorySchema, slugify } from "@/lib/product-admin";
import AdminImage from "./admin-image";
type Row = Record<string, any>;
export default function Categories({
  categories,
  products,
  onEdit,
  onCreate,
  onRemove,
}: {
  categories: Row[];
  products: Row[];
  onEdit: (c: Row) => void;
  onCreate: (parent?: string) => void;
  onRemove: (c: Row) => void;
}) {
  const [open, setOpen] = useState<string[]>([]),
    [q, setQ] = useState("");
  const node = (c: Row, depth: number, seen: string[]): React.ReactNode => {
    if (seen.includes(c.id)) return null;
    const children = categories
      .filter((x) => x.parent_id === c.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const expanded = open.includes(c.id) || !!q;
    const count = products.filter(
      (p) => p.category === c.id || p.category_ids?.includes(c.id),
    ).length;
    return (
      <div key={c.id}>
        <div
          className="category-tree-row"
          style={{ paddingLeft: 16 + depth * 22 }}
        >
          <button
            className="tree-expander"
            aria-label="Розгорнути категорію"
            disabled={!children.length}
            onClick={() =>
              setOpen(
                expanded ? open.filter((id) => id !== c.id) : [...open, c.id],
              )
            }
          >
            <ChevronRight
              size={15}
              style={{
                transform: expanded ? "rotate(90deg)" : undefined,
                opacity: children.length ? 1 : 0,
              }}
            />
          </button>
          <Folder size={21} />
          <button
            className="tree-name"
            onClick={() => onEdit({ ...c, _existing: true })}
          >
            {c.name}
            <small>{count} товарів</small>
          </button>
          <button
            className="icon-button"
            title="Додати підкатегорію"
            onClick={() => onCreate(c.id)}
          >
            <Plus size={16} />
          </button>
          <button
            className="icon-button"
            title="Редагувати"
            onClick={() => onEdit({ ...c, _existing: true })}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-button"
            title="Видалити"
            onClick={() => onRemove(c)}
          >
            <Trash2 size={15} />
          </button>
        </div>
        {expanded && children.map((x) => node(x, depth + 1, [...seen, c.id]))}
      </div>
    );
  };
  return (
    <div className="admin-panel">
      <div className="editor-section-heading">
        <h2>Категорії ({categories.length})</h2>
        <input
          placeholder="Пошук категорії"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {q
        ? categories
            .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
            .map((c) => node(c, 0, []))
        : categories
            .filter(
              (c) =>
                !c.parent_id || !categories.some((x) => x.id === c.parent_id),
            )
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((c) => node(c, 0, []))}
      {!categories.length && (
        <div className="editor-empty">
          <Folder size={36} />
          <h3>Створіть структуру магазину</h3>
          <button className="button" onClick={() => onCreate()}>
            Додати категорію
          </button>
        </div>
      )}
    </div>
  );
}
export function CategoryEditor({
  value,
  categories,
  products,
  demo,
  busy,
  onChange,
  onSave,
  onClose,
  onProduct,
  origin,
  message,
}: {
  value: Row;
  categories: Row[];
  products: Row[];
  demo: boolean;
  busy: boolean;
  onChange: (v: Row) => void;
  onSave: (v: Row) => void;
  onClose: () => void;
  onProduct: (v: Row) => void;
  origin: string;
  message: string;
}) {
  const c: Row = {
    description: "",
    image: "",
    seo_title: "",
    seo_description: "",
    noindex: false,
    parent_id: null,
    sort_order: 0,
    ...value,
  };
  const [tab, setTab] = useState("general"),
    [q, setQ] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const set = (k: string, v: any) => onChange({ ...c, [k]: v });
  const blocked = categoryBranch(categories as any, c.id);
  const members = products.filter(
    (p) =>
      (p.category === c.id || p.category_ids?.includes(c.id)) &&
      p.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <form
      className="catalog-workspace"
      onSubmit={(e) => {
        e.preventDefault();
        const r = categorySchema.safeParse(c);
        if (!r.success) {
          setError(r.error.issues.map((i) => i.message).join("; "));
          return;
        }
        onSave(r.data);
      }}
    >
      <header className="workspace-header">
        <button type="button" className="text-button" onClick={onClose}>
          <ArrowLeft size={18} /> Категорії
        </button>
        <span>/ {c.name || "Нова категорія"}</span>
        {value._existing && (
          <a href={"/category/" + c.id} target="_blank" rel="noreferrer">
            Сторінка магазину <ExternalLink size={15} />
          </a>
        )}
      </header>
      <nav className="editor-tabs">
        {[
          ["general", "Загальні"],
          ["seo", "SEO"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "general" ? (
        <>
          <section className="editor-section">
            <div className="category-edit-grid">
              <div>
                <div className="form-grid">
                  <label className="field">
                    Назва категорії
                    <input
                      value={c.name}
                      onChange={(e) =>
                        onChange({
                          ...c,
                          name: e.target.value,
                          ...(!value._existing &&
                          (!c.id || c.id === slugify(c.name))
                            ? { id: slugify(e.target.value) }
                            : {}),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Головна категорія
                    <select
                      value={c.parent_id || ""}
                      onChange={(e) => set("parent_id", e.target.value || null)}
                    >
                      <option value="">Без батьківської категорії</option>
                      {categories
                        .filter((x) => !blocked.includes(x.id))
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  Опис
                  <textarea
                    rows={7}
                    value={c.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </label>
                <label className="field">
                  Порядок
                  <input
                    type="number"
                    value={c.sort_order}
                    onChange={(e) => set("sort_order", Number(e.target.value))}
                  />
                </label>
              </div>
              <AdminImage
                label="Фото категорії"
                value={c.image}
                demo={demo}
                disabled={busy || uploading}
                onBusy={setUploading}
                onMessage={setError}
                onChange={(v) => set("image", v)}
              />
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section-heading">
              <h3>Товари ({members.length})</h3>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Пошук товарів категорії"
              />
            </div>
            {members.map((p) => (
              <div className="category-member" key={p.id}>
                <Image src={p.image} alt="" width={48} height={48} />
                <span>{p.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Редагувати товар"
                  onClick={() => onProduct(p)}
                >
                  <Pencil size={16} />
                </button>
              </div>
            ))}
            {!members.length && (
              <div className="editor-empty">
                Призначте цю категорію в редакторі товару.
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="editor-section">
          <div className="seo-preview">
            <small>
              {origin}/category/{c.id}
            </small>
            <h3>{c.seo_title || c.name}</h3>
            <p>{c.seo_description || c.description}</p>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={c.noindex}
              onChange={(e) => set("noindex", e.target.checked)}
            />{" "}
            Заборонити індексацію
          </label>
          <label className="field">
            Заголовок сторінки (70)
            <input
              maxLength={70}
              value={c.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
            />
          </label>
          <label className="field">
            Опис сторінки (320)
            <textarea
              maxLength={320}
              value={c.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
            />
          </label>
          <label className="field">
            URL / код категорії
            <input
              readOnly={!!value._existing}
              value={c.id}
              onChange={(e) => set("id", e.target.value)}
            />
            <small>
              Після створення код фіксується, щоб зберегти зв’язки товарів.
            </small>
          </label>
        </section>
      )}
      <footer className="editor-savebar">
        <span role="status">{error || message}</span>
        <button type="button" className="button outline" onClick={onClose}>
          Закрити
        </button>
        <button className="button" disabled={busy || uploading}>
          Зберегти
        </button>
      </footer>
    </form>
  );
}
