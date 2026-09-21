import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
const get = async (path, status = 200) => {
  const r = await fetch(origin + path);
  assert.equal(r.status, status, path);
  return r;
};
const catalog = await (await get("/api/catalog")).json();
assert.ok(catalog.length > 0);
for (const route of [
  "/",
  "/catalog",
  "/category/tea",
  "/checkout",
  "/admin",
  "/account",
  "/blog",
  "/blog/chia-pudding",
  "/contacts",
  "/delivery",
  "/privacy",
  "/returns",
  "/terms",
  "/account/reset",
  "/payment/result",
  "/sitemap.xml",
  "/robots.txt",
  ...catalog.map((p) => "/product/" + p.slug),
])
  await get(route);
await get("/does-not-exist", 404);
await get("/category/does-not-exist", 404);
await get("/merchant.xml", 503);
const delivery = await (await get("/api/delivery?q=Київ")).json();
assert.equal(delivery.configured, false);
const robots = await (await get("/robots.txt")).text();
assert.match(robots, /Disallow: \/\s/);
const home = await (await get("/")).text();
assert.ok(!home.includes("gtag/js?id="));
const post = (path, body) =>
  fetch(origin + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
assert.equal((await post("/api/orders", {})).status, 400);
// Run without Supabase credentials only: no orders or external effects are created.
const order = {
  name: "Тест",
  lastName: "Перевірка",
  phone: "+380000000000",
  email: "qa@example.invalid",
  city: "Київ",
  address: "Тестове відділення",
  delivery: "np",
  payment: "cod",
  consent: true,
  items: [{ id: "chia", quantity: 1 }],
  requestId: crypto.randomUUID(),
};
assert.equal((await post("/api/orders", order)).status, 503);
assert.equal((await get("/api/admin/products", 503)).status, 503);
assert.equal((await post("/api/payment", {})).status, 400);
assert.equal((await post("/api/notifications/process", {})).status, 401);
await get("/api/admin/notifications", 503);
await get("/api/admin/secrets", 503);
assert.equal(
  (
    await post("/api/admin/secrets", {
      id: "NOVA_POSHTA_API_KEY",
      value: "fake-test-value",
      version: null,
    })
  ).status,
  503,
);
console.log(
  "PASS: storefront, product pages, checkout, admin, metadata routes, 404, validation and disconnected-backend protections.",
);
