"use client";
import Link from "next/link";
import FormattedText from "./formatted-text";
import { inStock, quantityLimit } from "@/lib/inventory";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
} from "lucide-react";
import { money, type Product, categories } from "@/lib/data";
import { useShop } from "@/lib/store";
import { usePrice, useShopConfig } from "./shop-config";
import AnalyticsEvent from "./analytics-event";
import { item } from "@/lib/analytics";
export default function ProductDetail({
  product: p,
  variants = [],
}: {
  product: Product;
  variants?: Product[];
}) {
  const money = usePrice();
  const { freeShipping, categories, commerce } = useShopConfig();
  const [photo, setPhoto] = useState(p.image);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("description");
  const [zoom, setZoom] = useState(false);
  const { add, setCartOpen, toggleFavorite, favorites } = useShop();
  const router = useRouter();
  return (
    <>
      <AnalyticsEvent
        name="view_item"
        data={{ currency: "UAH", value: p.price, items: [item(p)] }}
      />
      <div className="detail-layout">
        <div>
          <div className="detail-image">
            <Image
              src={photo}
              alt={p.name}
              fill
              priority
              sizes="(max-width:800px) 100vw,50vw"
              style={{ objectFit: zoom ? "cover" : "contain" }}
            />
          </div>
          <div className="gallery-thumbnails">
            {[p.image, ...(p.additional_images || [])].map((src) => (
              <button
                key={src}
                className={photo === src ? "active" : ""}
                onClick={() => {
                  setPhoto(src);
                  setZoom(false);
                }}
                aria-label="Фото товару"
              >
                <Image src={src} alt="" width={72} height={72} />
              </button>
            ))}
            <button
              className={!zoom ? "active" : ""}
              onClick={() => setZoom(false)}
              aria-label="Повне фото"
            >
              <Image src={p.image} alt="Повне фото" width={72} height={72} />
            </button>
            <button
              className={zoom ? "active" : ""}
              onClick={() => setZoom(true)}
              aria-label="Роздивитися деталі"
            >
              <Image
                src={p.image}
                alt="Деталі продукту"
                width={72}
                height={72}
                style={{ objectFit: "cover" }}
              />
            </button>
          </div>
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            {categories.find((c) => c.id === p.category)?.name}
          </span>
          <h1>{p.name}</h1>
          <span className="availability">
            <Check size={15} />
            {inStock(p) ? commerce.stock_label : commerce.soldout_label} ·{" "}
            {p.weight}
          </span>
          <div className="tag-list">
            {p.tags.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
          {commerce.show_sku && p.sku && (
            <p className="field-help">Артикул: {p.sku}</p>
          )}
          {variants.length > 1 && (
            <div className="store-variants">
              <span>Оберіть варіант</span>
              {variants.map((v) => (
                <Link
                  key={v.id}
                  className={v.id === p.id ? "active" : ""}
                  href={"/product/" + v.slug}
                >
                  {v.variant_label || v.weight || v.name}
                </Link>
              ))}
            </div>
          )}
          <FormattedText text={p.description.split("\n\n")[0]} />
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            {p.old_price && <del>{money(p.old_price)}</del>}
          </div>
          <div className="detail-buy">
            <div className="quantity">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Менше"
              >
                <Minus size={16} />
              </button>
              <span>{qty}</span>
              <button
                onClick={() => setQty(Math.min(quantityLimit(p), qty + 1))}
                aria-label="Більше"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="button"
              disabled={!inStock(p)}
              onClick={() => add(p, qty)}
            >
              <ShoppingBag size={18} /> Додати в кошик
            </button>
            <button
              className="icon-button"
              onClick={() => toggleFavorite(p.id)}
              aria-label="Додати в обране"
            >
              <Heart
                fill={favorites.includes(p.id) ? "currentColor" : "none"}
                size={21}
              />
            </button>
          </div>
          <button
            className="button outline"
            disabled={!inStock(p)}
            onClick={() => {
              add(p, qty);
              setCartOpen(false);
              router.push("/checkout?quick=1");
            }}
          >
            Купити в 1 клік
          </button>
          <div className="detail-delivery">
            <span>
              <Truck size={18} /> Нова пошта, Укрпошта та кур’єр по Україні
            </span>
            <span>
              <ShieldCheck size={18} /> Оплата при отриманні або онлайн
            </span>
            <span>
              <Check size={18} /> Безкоштовна доставка від {money(freeShipping)}
            </span>
          </div>
        </div>
      </div>
      <div className="detail-tabs">
        {[
          ["description", "Опис товару"],
          ["ingredients", "Склад"],
          ["nutrition", "Харчова цінність"],
          ["attributes", "Характеристики"],
          ["files", "Документи"],
        ]
          .filter(([id]) => p.category !== "care" || id !== "nutrition")
          .map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
      </div>
      <div className="detail-content">
        {tab === "description" ? (
          <FormattedText text={p.description} />
        ) : tab === "ingredients" ? (
          <p>{p.ingredients}</p>
        ) : tab === "attributes" ? (
          <dl className="product-attributes">
            {(p.attributes || []).map((a, i) => (
              <div key={i}>
                <dt>{a.name}</dt>
                <dd>{a.value}</dd>
              </div>
            ))}
            {!p.attributes?.length && <p>Характеристики уточнюються.</p>}
          </dl>
        ) : tab === "files" ? (
          <div>
            {(p.attachments || []).map((a) => (
              <p key={a.url}>
                <a href={a.url} target="_blank" rel="noreferrer">
                  {a.name} ↗
                </a>
              </p>
            ))}
            {!p.attachments?.length && <p>Додаткових документів немає.</p>}
          </div>
        ) : (
          <>
            <p>Орієнтовно на 100 г продукту:</p>
            <div className="nutrition">
              {[
                ["Енергія", p.nutrition.kcal + " ккал"],
                ["Білки", p.nutrition.protein + " г"],
                ["Жири", p.nutrition.fat + " г"],
                ["Вуглеводи", p.nutrition.carbs + " г"],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
