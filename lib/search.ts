import type { Product } from "./data";
export const normalize = (text: string) =>
  text
    .toLocaleLowerCase("uk-UA")
    .replace(/[’'`ʼ-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = current;
  }
  return previous[b.length];
}
export function searchScore(
  product: Pick<Product, "name" | "tags" | "description">,
  query: string,
): number {
  const q = normalize(query);
  if (!q) return 1;
  const name = normalize(product.name);
  if (name.includes(q)) return 100 + (name.startsWith(q) ? 20 : 0);
  const words = normalize(product.name + " " + product.tags.join(" ")).split(
    /[^\p{L}\p{N}]+/u,
  );
  let score = 0;
  for (const term of q.split(" ")) {
    let best = 0;
    for (const word of words) {
      if (word.startsWith(term)) {
        best = 80;
        break;
      }
      if (word.includes(term)) {
        best = Math.max(best, 65);
        continue;
      }
      if (term.length >= 4) {
        const limit = term.length >= 7 ? 3 : term.length >= 5 ? 2 : 1;
        if (Math.abs(word.length - term.length) <= limit) {
          const d = distance(term, word);
          if (d <= limit && d / Math.max(word.length, term.length) <= 0.34)
            best = Math.max(best, 50 - d * 10);
        }
      }
    }
    if (!best) return 0;
    score += best;
  }
  return score;
}
export function searchProducts<
  T extends Pick<Product, "name" | "tags" | "description">,
>(products: T[], query: string): T[] {
  return products
    .map((p) => ({ p, score: searchScore(p, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
