"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { inStock, quantityLimit } from "./inventory";
import type { Product } from "./data";
import { track, item } from "./analytics";
type CartItem = { product: Product; quantity: number };
type Store = {
  items: CartItem[];
  favorites: string[];
  cartOpen: boolean;
  add: (product: Product, quantity?: number, openCart?: boolean) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  setCartOpen: (open: boolean) => void;
  toggleFavorite: (id: string) => void;
  refresh: (products: Product[]) => void;
};
export const useShop = create<Store>()(
  persist(
    (set, get) => ({
      items: [],
      favorites: [],
      cartOpen: false,
      add: (product, quantity = 1, openCart = true) => {
        if (!inStock(product) || !Number.isFinite(quantity)) return;
        const current =
          get().items.find((i) => i.product.id === product.id)?.quantity || 0;
        const next = Math.min(
          quantityLimit(product),
          current + Math.max(1, Math.floor(quantity)),
        );
        const delta = next - current;
        if (delta > 0)
          track("add_to_cart", {
            currency: "UAH",
            value: product.price * delta,
            items: [item(product, delta)],
          });
        set((s) => ({
          items: s.items.some((i) => i.product.id === product.id)
            ? s.items.map((i) =>
                i.product.id === product.id ? { product, quantity: next } : i,
              )
            : [...s.items, { product, quantity: next }],
          cartOpen: openCart,
        }));
      },
      setQuantity: (id, quantity) => {
        if (!Number.isFinite(quantity)) return;
        const row = get().items.find((i) => i.product.id === id);
        if (!row) return;
        const next = Math.max(
          0,
          Math.min(quantityLimit(row.product), Math.floor(quantity)),
        );
        const delta = next - row.quantity;
        if (delta)
          track(delta > 0 ? "add_to_cart" : "remove_from_cart", {
            currency: "UAH",
            value: Math.abs(delta) * row.product.price,
            items: [item(row.product, Math.abs(delta))],
          });
        set((s) => ({
          items: next
            ? s.items.map((i) =>
                i.product.id === id ? { ...i, quantity: next } : i,
              )
            : s.items.filter((i) => i.product.id !== id),
        }));
      },
      refresh: (products) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            const product = products.find((p) => p.id === i.product.id);
            return product && inStock(product)
              ? [
                  {
                    product,
                    quantity: Math.min(quantityLimit(product), i.quantity),
                  },
                ]
              : [];
          }),
        })),
      clear: () => set({ items: [] }),
      setCartOpen: (cartOpen) => {
        if (cartOpen)
          track("view_cart", {
            currency: "UAH",
            value: get().items.reduce(
              (s, i) => s + i.product.price * i.quantity,
              0,
            ),
            items: get().items.map((i) => item(i.product, i.quantity)),
          });
        set({ cartOpen });
      },
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
    }),
    {
      name: "eko-myata-cart",
      partialize: (s) => ({ items: s.items, favorites: s.favorites }),
    },
  ),
);
