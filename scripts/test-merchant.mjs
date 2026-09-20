import fs from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
async function load(file) {
  const s = ts.transpileModule(await fs.readFile(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(s).toString("base64")
  );
}
const { merchantXml, merchantIssues, validGtin } =
  await load("lib/merchant.ts");
const base = {
  id: "safe&1",
  slug: "peanut",
  name: "Паста <&>",
  description: "Арахіс & сіль",
  price: 100.25,
  old_price: 120,
  stock: 2,
  weight: "300 г",
  image: "/images/peanut.jpg",
  category: "oils",
  identifier_exists: false,
  merchant_enabled: true,
};
assert.ok(validGtin("4006381333931"));
assert.ok(!validGtin("4006381333932"));
assert.ok(!validGtin("123"));
assert.deepEqual(merchantIssues(base), []);
assert.ok(merchantIssues({ ...base, identifier_exists: true }).length);
const xml = merchantXml(
  [
    base,
    { ...base, id: "disabled", merchant_enabled: false },
    { ...base, id: "invalid", identifier_exists: true },
  ],
  "https://shop.example",
  "М’ята & Co",
);
assert.ok(xml.includes("100.25 UAH"));
assert.ok(xml.includes("120.00 UAH"));
assert.ok(xml.includes("Паста &lt;&amp;&gt;"));
assert.ok(xml.includes("https://shop.example/product/peanut"));
assert.ok(xml.includes("<g:identifier_exists>no"));
assert.equal((xml.match(/<item>/g) || []).length, 1);
assert.ok(
  merchantXml(
    [{ ...base, stock: 0 }],
    "https://shop.example",
    "Store",
  ).includes("out_of_stock"),
);
console.log(
  "PASS: feed XML escaping, identifiers, sale price, currency, absolute URLs, stock, disabled/invalid products.",
);
