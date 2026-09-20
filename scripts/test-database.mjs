import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);`,
);
const sql = (
  await fs.readFile("supabase/migrations/001_store.sql", "utf8")
).replace("create extension if not exists pgcrypto;", "");
await db.exec(sql);
await db.exec(await fs.readFile("supabase/migrations/002_launch.sql", "utf8"));
await db.exec(await fs.readFile("supabase/seed.sql", "utf8"));
assert.equal(
  (await db.query("select count(*)::int n from posts")).rows[0].n,
  3,
);
await db.exec(
  `insert into categories(id,name) values('test','Test');insert into products(id,slug,name,category,price,weight,stock,image) values('a','a','Almond','test',100,'100 г',5,'/images/almond.jpg');insert into promocodes(code,type,value,max_uses) values('MINT10','percent',10,1);`,
);
const base = {
  requestId: "00000000-0000-4000-8000-000000000001",
  name: "Тест",
  lastName: "Тест",
  phone: "+380000000000",
  email: "test@example.invalid",
  city: "Київ",
  address: "Test",
  delivery: "np",
  payment: "cod",
  items: [{ id: "a", quantity: 2 }],
  promo: "MINT10",
};
const call = async (payload) => {
  const r = await db.query("select place_order($1::jsonb) as result", [
    JSON.stringify(payload),
  ]);
  return r.rows[0].result;
};
const order = await call(base);
assert.equal(order.total, 180);
assert.equal(
  (await db.query("select stock from products where id='a'")).rows[0].stock,
  3,
);
assert.deepEqual(await call(base), order);
assert.equal(
  (await db.query("select stock from products where id='a'")).rows[0].stock,
  3,
);
await assert.rejects(
  () =>
    call({
      ...base,
      requestId: crypto.randomUUID(),
      items: [{ id: "a", quantity: 99 }],
      promo: "",
    }),
  /STOCK/,
);
await assert.rejects(
  () => call({ ...base, requestId: crypto.randomUUID() }),
  /PROMO/,
);
await assert.rejects(
  () =>
    call({
      ...base,
      requestId: crypto.randomUUID(),
      items: [{ id: "a", quantity: 0 }],
      promo: "",
    }),
  /QUANTITY/,
);
assert.equal(
  (await db.query("select count(*)::int n from orders")).rows[0].n,
  1,
);
await db.exec(
  `grant usage on schema public,auth to anon,authenticated;grant select,insert,update,delete on all tables in schema public to anon,authenticated;set role anon;`,
);
assert.equal((await db.query("select * from orders")).rows.length, 0);
await assert.rejects(() =>
  db
    .query("update products set stock=999 where id='a' returning *")
    .then((r) => {
      assert.equal(r.rows.length, 1);
    }),
);
await assert.rejects(
  () => call({ ...base, requestId: crypto.randomUUID() }),
  /permission denied/,
);
await db.exec(
  `reset role;insert into auth.users(id) values('00000000-0000-4000-8000-000000000002');set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);`,
);
await assert.rejects(() =>
  db
    .query("update profiles set role='admin' returning *")
    .then((r) => assert.equal(r.rows.length, 1)),
);
await assert.rejects(
  () => db.query("select update_order_status($1,$2)", [order.id, "Скасовано"]),
  /FORBIDDEN/,
);
await db.exec(
  `reset role;update profiles set role='admin' where id='00000000-0000-4000-8000-000000000002';set role authenticated;`,
);
await db.query("select update_order_status($1,$2)", [order.id, "Скасовано"]);
assert.equal(
  (await db.query("select stock from products where id='a'")).rows[0].stock,
  5,
);
await db.query("select update_order_status($1,$2)", [order.id, "Скасовано"]);
assert.equal(
  (await db.query("select stock from products where id='a'")).rows[0].stock,
  5,
);
await assert.rejects(
  () => db.query("select update_order_status($1,$2)", [order.id, "Нове"]),
  /CANNOT_REOPEN/,
);

await db.exec("reset role");
await db.exec(
  "insert into categories(id,name) values('parent','Parent');insert into categories(id,name,parent_id) values('child','Child','parent')",
);
await assert.rejects(
  () => db.exec("update categories set parent_id='child' where id='parent'"),
  /CATEGORY_CYCLE/,
);
const online = await call({
  ...base,
  requestId: crypto.randomUUID(),
  promo: "",
  payment: "mono",
  items: [{ id: "a", quantity: 1 }],
});
assert.equal(
  (await db.query("select claim_payment_attempt($1) ok", [online.id])).rows[0]
    .ok,
  true,
);
assert.equal(
  (await db.query("select claim_payment_attempt($1) ok", [online.id])).rows[0]
    .ok,
  false,
);
await db.exec("set role authenticated");
await assert.rejects(
  () => db.query("select update_order_status($1,$2)", [online.id, "Скасовано"]),
  /PAYMENT_PENDING/,
);
await db.exec("reset role");
await db.query("select record_payment($1,$2)", [online.id, "paid"]);
await db.query("select record_payment($1,$2)", [online.id, "failed"]);
assert.equal(
  (await db.query("select payment_status from orders where id=$1", [online.id]))
    .rows[0].payment_status,
  "paid",
);
await db.exec("set role authenticated");
await assert.rejects(
  () => db.query("select update_order_status($1,$2)", [online.id, "Скасовано"]),
  /REFUND_REQUIRED/,
);
await db.query("select set_manual_payment($1,$2)", [online.id, "refunded"]);
await db.query("select update_order_status($1,$2)", [online.id, "Скасовано"]);
const stats = (await db.query("select dashboard_stats(30) s")).rows[0].s;
assert.equal(stats.orders, 2);
assert.equal(stats.days.length, 30);
assert.equal(stats.revenue, 0);
await db.exec("reset role");
await db.exec(
  "update settings set value=value || jsonb_build_object('ga4_id','G-TEST123','legal_name','Test seller') where id='store'",
);
assert.equal(
  (await db.query("select value->>'ga4_id' id from settings where id='store'"))
    .rows[0].id,
  "G-TEST123",
);
await db.exec("set role anon");
await assert.rejects(
  () => db.query("select dashboard_stats(30)"),
  /permission denied/,
);
await assert.rejects(
  () => db.query("select record_payment($1,$2)", [online.id, "paid"]),
  /permission denied/,
);
await db.exec("reset role");
console.log(
  "PASS: launch migration, category cycles, payment claim concurrency guard, signed callback state, refund/cancellation, complete dashboard and saved settings.",
);
console.log(
  "PASS: server prices, coupon, inventory, idempotency, rollback, RLS, role protection, cancellation restore exactly once.",
);
// A verified customer may review the store, but not a product they never purchased.
await db.exec(
  "insert into auth.users(id) values('00000000-0000-4000-8000-000000000003')",
);
const purchased = await call({
  ...base,
  requestId: crypto.randomUUID(),
  promo: "",
  items: [{ id: "a", quantity: 1 }],
  user_id: "00000000-0000-4000-8000-000000000003",
});
await db.query("update orders set status='Виконано' where id=$1", [
  purchased.id,
]);
await db.exec(
  "set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false)",
);
await db.exec(
  "insert into reviews(user_id,name,rating,body) values(auth.uid(),'Test',5,'Store review')",
);
await db.exec(
  "insert into reviews(user_id,product_id,name,rating,body) values(auth.uid(),'a','Test',5,'Product review')",
);
await assert.rejects(
  () =>
    db.exec(
      "insert into reviews(user_id,product_id,name,rating,body) values(auth.uid(),'chia','Test',5,'Unpurchased review')",
    ),
  /row-level security/,
);
await assert.rejects(
  () =>
    db.exec(
      "insert into reviews(user_id,name,rating,body,approved) values(auth.uid(),'Test',5,'Self approval',true)",
    ),
  /row-level security/,
);
await db.exec("reset role");
console.log(
  "PASS: purchase-verified store/product reviews and moderation protection.",
);
await db.close();
