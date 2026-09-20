import type { Product } from "./data";
export function validGtin(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const n = value.split("").map(Number);
  const check = n.pop()!;
  return (
    (10 - (n.reverse().reduce((s, x, i) => s + x * (i % 2 ? 1 : 3), 0) % 10)) %
      10 ===
    check
  );
}
export function merchantIssues(p: Product) {
  return [
    !p.name.trim() && "Назва",
    !p.description.trim() && "Опис",
    !p.image && "Фото",
    !(p.price > 0) && "Ціна",
    p.gtin && !validGtin(p.gtin) && "Некоректний GTIN",
    p.identifier_exists !== false &&
      !p.gtin &&
      !(p.brand && p.mpn) &&
      "GTIN або бренд + MPN",
    p.identifier_exists === false &&
      (!!p.gtin || !!(p.brand && p.mpn)) &&
      "GTIN заданий, але ідентифікатори вимкнені",
  ].filter(Boolean) as string[];
}
export const xml = (v: unknown) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
export function merchantXml(products: Product[], origin: string, name: string) {
  const tag = (k: string, v: unknown) =>
    "<g:" + k + ">" + xml(v) + "</g:" + k + ">";
  const items = products
    .filter((p) => p.merchant_enabled && !merchantIssues(p).length)
    .map((p) => {
      const sale = !!p.old_price && p.old_price > p.price;
      return (
        "<item>" +
        tag("id", p.id) +
        tag("title", p.name + " — " + p.weight) +
        tag("description", p.description) +
        tag("link", new URL("/product/" + p.slug, origin).href) +
        tag("image_link", new URL(p.image, origin).href) +
        tag("availability", p.stock > 0 ? "in_stock" : "out_of_stock") +
        tag("price", (sale ? p.old_price! : p.price).toFixed(2) + " UAH") +
        (sale ? tag("sale_price", p.price.toFixed(2) + " UAH") : "") +
        tag("condition", "new") +
        (p.brand ? tag("brand", p.brand) : "") +
        (p.gtin ? tag("gtin", p.gtin) : "") +
        (p.mpn ? tag("mpn", p.mpn) : "") +
        tag("identifier_exists", p.identifier_exists === false ? "no" : "yes") +
        (p.google_category
          ? tag("google_product_category", p.google_category)
          : "") +
        tag("product_type", p.category) +
        (p.additional_images || [])
          .slice(0, 10)
          .map((i) => tag("additional_image_link", new URL(i, origin).href))
          .join("") +
        "</item>"
      );
    });
  return (
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>' +
    xml(name) +
    "</title><link>" +
    xml(origin) +
    "</link><description>Каталог товарів</description>" +
    items.join("") +
    "</channel></rss>"
  );
}
