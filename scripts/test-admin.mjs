import { build } from "esbuild";
import path from "node:path";
import { createRequire } from "node:module";
const source = `
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
import ProductEditor from './components/admin-product-editor';import Categories,{CategoryEditor} from './components/admin-categories';import Homepage from './components/admin-homepage';import FormattedText from './components/formatted-text';
import {products,categories} from './lib/data';import {homeSchema,defaultHome,safeLink} from './lib/content-settings';import {productSchema} from './lib/validation';import {inStock,quantityLimit} from './lib/inventory';import {categoryBranch} from './lib/product-admin';
const noop=()=>{};const p=products[0];
const html=renderToStaticMarkup(<ProductEditor value={p} categories={categories} products={products} demo busy={false} message="" origin="https://shop.example" onChange={noop} onSave={async()=>true} onClose={noop} onOpen={noop} onVariant={noop} onDuplicate={noop}/>);
assert.ok(html.includes('Примітки до товару'));assert.ok(html.includes('Схожі товари'));assert.ok(html.includes('Головна категорія'));
assert.ok(renderToStaticMarkup(<Categories categories={categories} products={products} onEdit={noop} onCreate={noop} onRemove={noop}/>).includes('Суперфуди'));
assert.ok(renderToStaticMarkup(<CategoryEditor value={{id:'test',name:'Test'}} categories={categories} products={products} demo busy={false} onChange={noop} onSave={noop} onClose={noop} onProduct={noop} origin="" message=""/>).includes('Головна категорія'));
assert.ok(renderToStaticMarkup(<Homepage settings={{}} products={products} demo busy={false} onSave={async()=>true}/>).includes('Зберегти чернетку'));
const rendered=renderToStaticMarkup(<FormattedText text={'<script>alert(1)</script> **корисне** [unsafe](javascript:alert)'} />);
assert.ok(!rendered.includes('<script>'));assert.ok(rendered.includes('<strong>корисне</strong>'));assert.ok(!rendered.includes('href="javascript:'));
assert.ok(homeSchema.safeParse(defaultHome).success);
for(const value of ['javascript:alert(1)','//outside.example','/\\\\outside.example'])assert.ok(!safeLink.safeParse(value).success);
assert.ok(safeLink.safeParse('/category/tea').success);
assert.ok(productSchema.safeParse(p).success);
assert.equal(inStock({...p,stock:0,track_stock:false}),true);assert.equal(quantityLimit({...p,stock:0,track_stock:false}),100);assert.equal(inStock({...p,available:false}),false);
assert.deepEqual(categoryBranch([{id:'root'},{id:'child',parent_id:'root'},{id:'grandchild',parent_id:'child'}],'root'),['root','child','grandchild']);
console.log('PASS: editor rendering, empty category, homepage drafts, safe formatting/links, product defaults, inventory and category tree.');
`;
const outfile = path.resolve(".sites-runtime/editor-render.cjs");
await build({
  stdin: {
    contents: source,
    resolveDir: process.cwd(),
    sourcefile: "editor-render.tsx",
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
createRequire(import.meta.url)(outfile);
