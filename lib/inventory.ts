import type { Product } from "./data";
export function inStock(
  p: Pick<Product, "stock" | "available" | "track_stock">,
) {
  return p.available !== false && (p.track_stock === false || p.stock > 0);
}
export function quantityLimit(
  p: Pick<Product, "stock" | "available" | "track_stock">,
) {
  return !inStock(p)
    ? 0
    : Math.min(100, p.track_stock === false ? 100 : p.stock);
}
