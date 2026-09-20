import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {}
let failures = 0;
function check(name, ok, detail = "") {
  console.log(
    (ok ? "OK  " : "TODO") + " " + name + (detail ? " — " + detail : ""),
  );
  if (!ok) failures++;
}
const env = process.env;
for (const key of [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
])
  check(key, !!env[key]);
check(
  "Публічна HTTPS-адреса",
  /^https:\/\//.test(env.NEXT_PUBLIC_SITE_URL || ""),
);
if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { error } = await db
    .from("products")
    .select("gtin,merchant_enabled")
    .limit(1);
  check("Міграція 002", !error);
  const { data, error: e } = await db
    .from("settings")
    .select("value")
    .eq("id", "store")
    .single();
  check("Налаштування в БД", !e);
  if (data) {
    const s = data.value;
    for (const key of [
      "site_url",
      "legal_name",
      "email",
      "phone",
      "address",
      "shipping_details",
      "returns_policy",
      "terms",
    ])
      check("Заповнено " + key, !!s[key]);
    check("Приймання замовлень", !!s.store_open);
    check("SEO-видимість", !!s.seo_visible);
    check("Фід Google", !!s.merchant_enabled);
    if (s.mono) check("Monobank token", !!env.MONOBANK_TOKEN);
    if (s.liqpay)
      check("LiqPay keys", !!env.LIQPAY_PUBLIC_KEY && !!env.LIQPAY_PRIVATE_KEY);
    check(
      "Аналітика",
      s.analytics_mode === "ga4"
        ? !!s.ga4_id
        : s.analytics_mode === "gtm"
          ? !!s.gtm_id
          : false,
    );
    const { count } = await db
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    check("Є адміністратор", !!count);
  }
}
console.log(
  "Перевірка не змінює дані. Додатково виконайте реальне тестове замовлення, тест банку та перевірку Google.",
);
process.exitCode = failures ? 1 : 0;
