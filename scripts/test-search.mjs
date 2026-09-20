import ts from "typescript";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const source = await fs.readFile("lib/search.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { searchProducts } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const p = [
  { name: "Арахісова паста кранч", tags: ["Веган"], description: "" },
  { name: "Арахісова паста ніжна", tags: ["Веган"], description: "" },
  { name: "Мигдаль сирий", tags: ["RAW"], description: "" },
];
assert.equal(searchProducts(p, "арахова").length, 2);
assert.equal(searchProducts(p, "АРАХІСОВА").length, 2);
assert.equal(searchProducts(p, "паста кра").length, 1);
assert.equal(searchProducts(p, "мигдал").length, 1);
assert.equal(searchProducts(p, "ананас").length, 0);
assert.equal(searchProducts(p, "").length, 3);
console.log(
  "PASS: live search typo арахова, case, multi-word, partial, empty and no-match queries.",
);
