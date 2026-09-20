import fs from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
const code = ts.transpileModule(await fs.readFile("lib/analytics.ts", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const calls = [];
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v),
};
globalThis.location = { pathname: "/checkout", origin: "https://shop.example" };
globalThis.window = {
  dataLayer: [],
  gtag: (...args) => calls.push(args),
  ekoAnalytics: { mode: "ga4", ready: true },
};
const { track, purchase } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
assert.equal(track("view_item", {}), false);
assert.equal(calls.length, 0);
storage.set(
  "eko-consent-v1",
  JSON.stringify({ analytics: true, marketing: false }),
);
assert.equal(track("view_item", {}), true);
const order = {
  id: "order-1",
  total: 90,
  payment: "mono",
  payment_status: "pending",
  items: [{ id: "p", name: "Product", price: 100, quantity: 1 }],
};
purchase(order);
assert.equal(calls.length, 1);
purchase({ ...order, payment_status: "paid" });
purchase({ ...order, payment_status: "paid" });
assert.equal(calls.length, 2);
assert.equal(calls[1][2].value, 90);
assert.equal(calls[1][2].transaction_id, "order-1");
assert.equal(calls[1][2].items[0].price, 90);
location.pathname = "/account/reset";
assert.equal(track("page_view", {}), false);
console.log(
  "PASS: consent blocking, confirmed online purchase, transaction deduplication, discounts and account exclusion.",
);
