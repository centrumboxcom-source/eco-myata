"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Pencil, Copy, ExternalLink, Download } from "lucide-react";
import { money } from "@/lib/data";
import { csvDownload } from "@/lib/csv";
type Row = Record<string, any>;
export default function Products({
  products,
  categories,
  onEdit,
  onDuplicate,
  onBulk,
  busy,
  onRefresh,
}: {
  products: Row[];
  categories: Row[];
  onEdit: (p: Row) => void;
  onDuplicate: (p: Row) => void;
  onBulk: (ids: string[], changes: Row) => Promise<void>;
  busy: boolean;
  onRefresh: () => void;
}) {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [visibility, setVisibility] = useState(""),
    [stock, setStock] = useState(""),
    [sort, setSort] = useState("new"),
    [selected, setSelected] = useState<string[]>([]),
    [page, setPage] = useState(0),
    [action, setAction] = useState(""),
    [target, setTarget] = useState("");
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (p.name + " " + (p.sku || "") + " " + p.id)
              .toLowerCase()
              .includes(q.toLowerCase()) &&
            (!category ||
              p.category === category ||
              p.category_ids?.includes(category)) &&
            (!visibility ||
              (visibility === "draft"
                ? p.active === false
                : p.active !== false)) &&
            (!stock ||
              (stock === "out"
                ? p.available === false ||
                  (p.track_stock !== false && p.stock === 0)
                : p.track_stock !== false && p.stock > 0 && p.stock <= 5)),
        )
        .sort((a, b) =>
          sort === "asc"
            ? a.price - b.price
            : sort === "desc"
              ? b.price - a.price
              : sort === "name"
                ? a.name.localeCompare(b.name, "uk")
                : (b.created_at || b.id).localeCompare(a.created_at || a.id),
        ),
    [products, q, category, visibility, stock, sort],
  );
  const rows = filtered.slice(page * 25, page * 25 + 25);
  const change = (fn: () => void) => {
    fn();
    setPage(0);
  };
  return (
    <div className="admin-panel">
      <div className="product-list-tools">
        <input
          placeholder="Пошук за назвою, артикулом або кодом"
          value={q}
          onChange={(e) => change(() => setQ(e.target.value))}
        />
        <button className="button outline" onClick={onRefresh} disabled={busy}>
          Оновити
        </button>
        <button
          className="button outline"
          onClick={() =>
            csvDownload("products", [
              [
                "ID",
                "Артикул",
                "Назва",
                "Категорія",
                "Ціна",
                "Залишок",
                "Опубліковано",
              ],
              ...filtered.map((p) => [
                p.id,
                p.sku,
                p.name,
                categories.find((c) => c.id === p.category)?.name,
                p.price,
                p.stock,
                p.active !== false ? "Так" : "Ні",
              ]),
            ])
          }
        >
          <Download size={15} /> CSV
        </button>
      </div>
      <div className="product-list-filters">
        <select
          value={category}
          onChange={(e) => change(() => setCategory(e.target.value))}
        >
          <option value="">Усі категорії</option>
          {categories.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={(e) => change(() => setVisibility(e.target.value))}
        >
          <option value="">Будь-яка видимість</option>
          <option value="published">Опубліковано</option>
          <option value="draft">Чернетки</option>
        </select>
        <select
          value={stock}
          onChange={(e) => change(() => setStock(e.target.value))}
        >
          <option value="">Усі запаси</option>
          <option value="out">Недоступні</option>
          <option value="low">Закінчуються (до 5)</option>
        </select>
        <select
          value={sort}
          onChange={(e) => change(() => setSort(e.target.value))}
        >
          <option value="new">Нові спочатку</option>
          <option value="name">За назвою</option>
          <option value="asc">Ціна ↑</option>
          <option value="desc">Ціна ↓</option>
        </select>
      </div>
      {selected.length > 0 && (
        <div className="bulk-toolbar">
          <b>Обрано: {selected.length}</b>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Оберіть дію</option>
            <option value="publish">Опублікувати</option>
            <option value="draft">У чернетки</option>
            <option value="feature">Додати до хітів</option>
            <option value="unfeature">Прибрати з хітів</option>
            <option value="category">Змінити головну категорію</option>
          </select>
          {action === "category" && (
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Категорія</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="button"
            disabled={busy || !action || (action === "category" && !target)}
            onClick={async () => {
              await onBulk(
                selected,
                action === "category"
                  ? { category: target }
                  : action === "publish"
                    ? { active: true }
                    : action === "draft"
                      ? { active: false }
                      : { featured: action === "feature" },
              );
              setSelected([]);
            }}
          >
            Застосувати
          </button>
          <button onClick={() => setSelected([])}>Скинути</button>
        </div>
      )}
      <div className="table-scroll">
        <table className="admin-table product-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Обрати сторінку"
                  checked={
                    rows.length > 0 &&
                    rows.every((p) => selected.includes(p.id))
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...new Set([...selected, ...rows.map((p) => p.id)])]
                        : selected.filter(
                            (id) => !rows.some((p) => p.id === id),
                          ),
                    )
                  }
                />
              </th>
              <th>Товар</th>
              <th>Ціна</th>
              <th>Запаси</th>
              <th>Видимість</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={"Обрати " + p.name}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.id]
                          : selected.filter((id) => id !== p.id),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="product-table-name"
                    onClick={() => onEdit(p)}
                  >
                    <Image
                      src={p.image || "/images/chia.jpg"}
                      alt=""
                      width={48}
                      height={48}
                    />
                    <span>
                      {p.name}
                      <small>
                        {p.sku || p.id}
                        {p.variant_label ? " · " + p.variant_label : ""}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  {money(p.price)}
                  {p.old_price > p.price && (
                    <small>
                      <del>{money(p.old_price)}</del>
                    </small>
                  )}
                </td>
                <td>
                  {p.available === false
                    ? "Недоступний"
                    : p.track_stock === false
                      ? "Без обліку"
                      : p.stock + " шт."}
                </td>
                <td>
                  <span
                    className={
                      "catalog-status " + (p.active === false ? "draft" : "")
                    }
                  >
                    {p.active === false ? "Чернетка" : "Опубліковано"}
                  </span>
                  {p.featured && <small>Хіт продажу</small>}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      title="Редагувати"
                      onClick={() => onEdit(p)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      title="Дублювати"
                      onClick={() => onDuplicate(p)}
                    >
                      <Copy size={15} />
                    </button>
                    {p.active !== false && (
                      <a
                        className="icon-button"
                        href={"/product/" + p.slug}
                        target="_blank"
                        rel="noreferrer"
                        title="Відкрити"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="editor-empty">Товарів за цими умовами не знайдено.</div>
      )}
      <div className="table-pagination">
        <span>
          Знайдено {filtered.length} · Сторінка {page + 1} з{" "}
          {Math.max(1, Math.ceil(filtered.length / 25))}
        </span>
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Назад
        </button>
        <button
          disabled={(page + 1) * 25 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Далі
        </button>
      </div>
    </div>
  );
}
