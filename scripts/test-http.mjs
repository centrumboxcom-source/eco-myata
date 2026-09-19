import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const get=async(path,status=200)=>{const r=await fetch(origin+path);assert.equal(r.status,status,path);return r};
const catalog=await (await get('/api/catalog')).json();assert.ok(catalog.length>0);
for(const route of ['/','/catalog','/checkout','/admin','/account','/blog','/blog/chia-pudding','/contacts','/delivery','/privacy','/sitemap.xml','/robots.txt',...catalog.map(p=>'/product/'+p.slug)])await get(route);
await get('/does-not-exist',404);
const post=(path,body)=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await post('/api/orders',{})).status,400);
// Run without Supabase credentials only: no orders or external effects are created.
const order={name:'Тест',lastName:'Перевірка',phone:'+380000000000',email:'qa@example.invalid',city:'Київ',address:'Тестове відділення',delivery:'np',payment:'cod',consent:true,items:[{id:'chia',quantity:1}],requestId:crypto.randomUUID()};
assert.equal((await post('/api/orders',order)).status,503);
assert.equal((await get('/api/admin/products',503)).status,503);
assert.equal((await post('/api/payment',{})).status,400);
console.log('PASS: storefront, product pages, checkout, admin, metadata routes, 404, validation and disconnected-backend protections.');
