"use client";
import { useEffect, useMemo, useState } from "react";
import { categoryBranch } from "@/lib/product-admin";
import { searchScore } from "@/lib/search";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { type Product } from "@/lib/data";
import { useShop } from "@/lib/store";
import { ProductCard } from "./shop";
export default function Catalog({
  products,
  categories,
  hideHeading = false,
}: {
  hideHeading?: boolean;
  products: Product[];
  categories: { id: string; name: string; parent_id?: string | null }[];
}) {
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get("category") || "");
  const [tags, setTags] = useState<string[]>([]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1000);
  const [sort, setSort] = useState(params.get("sort") || "popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") || "");
  const { favorites } = useShop();
  useEffect(() => {
    setQuery(params.get("q") || "");
    setCategory(params.get("category") || "");
    setSort(params.get("sort") || "popular");
  }, [params]);
  const sale = params.get("sale") === "1",
    onlyFavorites = params.get("favorites") === "1";
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (!category ||
              categoryBranch(categories, category).some(
                (id) => p.category === id || p.category_ids?.includes(id),
              )) &&
            p.price >= min &&
            p.price <= max &&
            tags.every((t) => p.tags.includes(t)) &&
            (!sale || !!p.old_price) &&
            (!onlyFavorites || favorites.includes(p.id)) &&
            searchScore(p, query) > 0,
        )
        .sort((a, b) =>
          sort === "asc"
            ? a.price - b.price
            : sort === "desc"
              ? b.price - a.price
              : sort === "new"
                ? (b.created_at || b.id).localeCompare(a.created_at || a.id)
                : Number(b.featured) - Number(a.featured),
        ),
    [
      products,
      category,
      min,
      max,
      tags,
      sale,
      onlyFavorites,
      favorites,
      query,
      sort,
    ],
  );
  const reset = () => {
    setCategory("");
    setTags([]);
    setMin(0);
    setMax(1000);
    setQuery("");
  };
  return (
    <>
      {!hideHeading && (
        <h1 className="page-title">
          {onlyFavorites
            ? "Ваше обране"
            : sale
              ? "Приємні пропозиції"
              : categories.find((c) => c.id === category)?.name ||
                "Крамниця природної користі"}
        </h1>
      )}
      <p className="page-description">
        Прості інгредієнти. Справжній смак. Оберіть своє.
      </p>
      <div className="catalog-layout">
        <aside className={"catalog-filters " + (filtersOpen ? "open" : "")}>
          <div className="filter-group">
            <h3>Категорії</h3>
            <label>
              <input
                type="radio"
                name="category"
                checked={!category}
                onChange={() => setCategory("")}
              />
              Усі товари
            </label>
            {categories.map((c) => (
              <label key={c.id}>
                <input
                  type="radio"
                  name="category"
                  checked={category === c.id}
                  onChange={() => setCategory(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h3>Ціна, ₴</h3>
            <div className="price-inputs">
              <input
                aria-label="Мінімальна ціна"
                type="number"
                min={0}
                max={max}
                value={min}
                onChange={(e) => setMin(Number(e.target.value))}
              />
              <input
                aria-label="Максимальна ціна"
                type="number"
                min={min}
                max={10000}
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
              />
            </div>
            <input
              aria-label="Верхня межа ціни"
              type="range"
              min={0}
              max={1000}
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </div>
          <div className="filter-group">
            <h3>Ваші вподобання</h3>
            {["Без глютену", "Веган", "Без цукру", "RAW"].map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={tags.includes(t)}
                  onChange={() =>
                    setTags(
                      tags.includes(t)
                        ? tags.filter((x) => x !== t)
                        : [...tags, t],
                    )
                  }
                />
                {t}
              </label>
            ))}
          </div>
          <button onClick={reset} className="text-button">
            Скинути фільтри
          </button>
        </aside>
        <div className="catalog-products">
          <div className="catalog-toolbar">
            <span>{filtered.length} товарів</span>
            <button
              className="mobile-only filter-toggle"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={15} /> Фільтри
            </button>
            <select
              aria-label="Сортування"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="popular">За популярністю</option>
              <option value="asc">Від дешевих до дорогих</option>
              <option value="desc">Від дорогих до дешевих</option>
              <option value="new">Спочатку новинки</option>
            </select>
          </div>
          <div
            className="search"
            style={{ maxWidth: "none", marginBottom: 20 }}
          >
            <Search size={17} />
            <input
              aria-label="Пошук у каталозі"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Шукати в каталозі…"
            />
          </div>
          {tags.map((t) => (
            <button
              key={t}
              className="filter-chip"
              onClick={() => setTags(tags.filter((x) => x !== t))}
            >
              {t}
              <X size={12} />
            </button>
          ))}
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={40} />
              <h3>Нічого не знайшлося</h3>
              <p>Спробуйте іншу назву або змініть фільтри.</p>
              <button className="button" onClick={reset}>
                Скинути фільтри
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
