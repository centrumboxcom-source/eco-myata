import { getProducts } from "./catalog";
import { configured, sessionClient } from "./server";
import { createClient } from "@supabase/supabase-js";
export async function resolveProduct(slug: string) {
  const products = await getProducts();
  const product = products.find((p) => p.slug === slug);
  if (product) return { product, products, redirect: false };
  if (configured()) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await client
      .from("product_slug_history")
      .select("product_id")
      .eq("slug", slug)
      .maybeSingle();
    const next = products.find((p) => p.id === data?.product_id);
    if (next) return { product: next, products, redirect: true };
  }
  return { product: undefined, products, redirect: false };
}
