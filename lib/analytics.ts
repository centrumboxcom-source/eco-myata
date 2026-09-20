"use client";
import type { Product } from "./data";
export type Consent = { analytics: boolean; marketing: boolean };
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    ekoAnalytics?: { mode: string; ready: boolean };
  }
}
export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem("eko-consent-v1") || "null");
    return c &&
      typeof c.analytics === "boolean" &&
      typeof c.marketing === "boolean"
      ? c
      : null;
  } catch {
    return null;
  }
}
export function track(name: string, data: Record<string, unknown> = {}) {
  if (
    typeof window === "undefined" ||
    !readConsent()?.analytics ||
    !window.ekoAnalytics?.ready ||
    /^\/(admin|account)(\/|$)/.test(location.pathname)
  )
    return false;
  const state = window.ekoAnalytics;
  if (state.mode === "gtm") {
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event: name, ecommerce: data });
  } else
    window.gtag("event", name, {
      ...data,
      page_location: location.origin + location.pathname,
    });
  return true;
}
export function item(
  p: Pick<Product, "id" | "name" | "price" | "category" | "brand">,
  quantity = 1,
) {
  return {
    item_id: p.id,
    item_name: p.name,
    item_brand: p.brand || undefined,
    item_category: p.category,
    price: p.price,
    quantity,
  };
}
export type Purchase = {
  id: string;
  total: number;
  discount?: number;
  payment: string;
  payment_status?: string;
  items: { id: string; name: string; price: number; quantity: number }[];
};
export function purchase(order: Purchase) {
  if (typeof window === "undefined") return;
  const key = "eko-purchase-" + order.id;
  try {
    if (localStorage.getItem(key)) return;
  } catch {}
  if (
    ["mono", "liqpay"].includes(order.payment) &&
    order.payment_status !== "paid"
  )
    return;
  const raw = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const ratio = raw ? order.total / raw : 1;
  const sent = track("purchase", {
    transaction_id: order.id,
    currency: "UAH",
    value: order.total,
    items: order.items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: Math.round(i.price * ratio * 100) / 100,
      quantity: i.quantity,
    })),
  });
  if (sent)
    try {
      localStorage.setItem(key, "1");
    } catch {}
}
