import { categorySchema, type Category } from "./product-admin";
import { createClient } from "@supabase/supabase-js";
import { products, categories, type Product } from "./data";
export async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return products;
  const client = createClient(url, key);
  const result: Product[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Не вдалося завантажити каталог");
    result.push(...(data as Product[]));
    if (data.length < 1000) break;
  }
  return result;
}

export async function getCategories(): Promise<
  (Category & { color?: string })[]
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    return categories.map((c) => ({
      ...categorySchema.parse(c),
      color: c.color,
    }));
  const { data, error } = await createClient(url, key)
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}
