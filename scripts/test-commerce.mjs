import { build } from "esbuild";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const outfile = path.resolve(".sites-runtime/commerce-test.cjs");
await build({
  stdin: {
    contents: `
import React from "react";import {renderToStaticMarkup} from "react-dom/server";
import AdminCommerce from "./components/admin-commerce";import AdminNotifications from "./components/admin-notifications";
export {commerceSchema,defaultCommerce,formatPrice} from "./lib/commerce-settings";
export {notificationSchema} from "./lib/notification-settings";
export {deliverNotification} from "./lib/notification-delivery";
import {defaultSettings} from "./lib/store-settings";
export function renderEditors(){return [renderToStaticMarkup(<AdminCommerce value={defaultSettings} onChange={()=>{}} onSave={async()=>true} busy={false} demo/>),renderToStaticMarkup(<AdminNotifications value={defaultSettings} onChange={()=>{}} onSave={async()=>true} busy={false} demo/>)];}
`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  jsx: "automatic",
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  outfile,
  logLevel: "silent",
});
const {
  commerceSchema,
  defaultCommerce,
  formatPrice,
  notificationSchema,
  deliverNotification,
  renderEditors,
} = createRequire(import.meta.url)(outfile);
assert.equal(commerceSchema.safeParse({ minimum_order: -1 }).success, false);
assert.equal(commerceSchema.safeParse({ page_size: 13 }).success, false);
assert.equal(
  commerceSchema.safeParse({
    social_links: [{ label: "Bad", href: "javascript:alert(1)" }],
  }).success,
  false,
);
assert.equal(
  commerceSchema.safeParse({
    extra_fields: [
      {
        id: "gift",
        label: "Gift",
        type: "select",
        required: true,
        options: [],
      },
    ],
  }).success,
  false,
);
assert.equal(
  commerceSchema.safeParse({
    extra_fields: [
      { id: "gift", label: "Gift", type: "text" },
      { id: "gift", label: "Gift2", type: "text" },
    ],
  }).success,
  false,
);
assert.equal(
  notificationSchema.safeParse({ telegram_enabled: true }).success,
  false,
);
assert.equal(
  notificationSchema.safeParse({
    telegram_enabled: true,
    telegram_chat_id: "-100123",
  }).success,
  true,
);
assert.equal(
  notificationSchema.safeParse({ customer_email_enabled: true }).success,
  false,
);
assert.match(
  formatPrice(1250, {
    ...defaultCommerce,
    price_decimals: "two",
    price_symbol: "UAH",
  }),
  /250,00 UAH$/,
);
const html = renderEditors();
assert.ok(html[0].includes("Формат даних"));
assert.ok(html[0].includes("Кошик"));
assert.ok(html[1].includes("Журнал відправок"));
const job = {
  id: "test-id",
  channel: "customer_email",
  recipient: "customer@example.invalid",
  sender: "orders@example.invalid",
  subject: "Order",
  body: "Body",
};
let calls = 0;
const success = async (url, options) => {
  calls++;
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(
    options.headers["Idempotency-Key"],
    "order-notification/test-id",
  );
  assert.deepEqual(JSON.parse(options.body).to, ["customer@example.invalid"]);
  return Response.json({ id: "provider-id" });
};
assert.equal((await deliverNotification(job, {}, success)).status, "failed");
assert.equal(calls, 0);
assert.equal(
  (await deliverNotification(job, { resend: "fake-test-key" }, success)).status,
  "sent",
);
assert.equal(
  (
    await deliverNotification(job, { resend: "fake" }, async () =>
      Response.json({}, { status: 400 }),
    )
  ).status,
  "failed",
);
assert.equal(
  (
    await deliverNotification(job, { resend: "fake" }, async () =>
      Response.json({}, { status: 500 }),
    )
  ).status,
  "uncertain",
);
assert.equal(
  (
    await deliverNotification(job, { resend: "fake" }, async () => {
      throw Error("network");
    })
  ).status,
  "uncertain",
);
assert.equal(
  (
    await deliverNotification(
      { ...job, channel: "telegram", recipient: "123" },
      { telegram: "fake" },
      async (url, options) => {
        assert.equal(JSON.parse(options.body).chat_id, "123");
        return Response.json({ ok: true });
      },
    )
  ).status,
  "sent",
);
console.log(
  "PASS: functional settings validation, price formatting, editor rendering, notification payloads/idempotency, missing keys and ambiguous delivery. No external messages sent.",
);
