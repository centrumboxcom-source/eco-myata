import fs from 'node:fs/promises';
import ts from 'typescript';
async function load(path){const code=ts.transpileModule(await fs.readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {products,categories}=await load('lib/data.ts');
const literal=v=>v===null||v===undefined?'null':typeof v==='number'||typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const cat=categories.map((c,i)=>`(${literal(c.id)},${literal(c.name)},${i})`).join(',\n');
const rows=products.map(p=>'('+[p.id,p.slug,p.name,p.category,p.price,p.old_price,p.weight,p.stock].map(literal).join(',')+','+literal(JSON.stringify(p.tags))+'::jsonb,'+[p.image,p.description,p.ingredients].map(literal).join(',')+','+literal(JSON.stringify(p.nutrition))+'::jsonb,'+literal(p.featured)+')').join(',\n');
const sql=`-- Demonstration catalog. Replace with actual product data before accepting sales.\ninsert into categories(id,name,sort_order) values ${cat} on conflict(id) do nothing;\ninsert into products(id,slug,name,category,price,old_price,weight,stock,tags,image,description,ingredients,nutrition,featured) select id,slug,name,category,price,old_price,weight,stock,array(select jsonb_array_elements_text(tags)),image,description,ingredients,nutrition,featured from (values ${rows}) as v(id,slug,name,category,price,old_price,weight,stock,tags,image,description,ingredients,nutrition,featured) on conflict(id) do nothing;\n`;
const postSource=(await fs.readFile('lib/posts.ts','utf8')).replace(/import .*?;\r?\n/,'');
const postCode=ts.transpileModule(postSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {samplePosts}=await import('data:text/javascript;base64,'+Buffer.from(postCode).toString('base64'));
const postRows=samplePosts.map(p=>'('+[p.slug,p.title,p.excerpt,p.content,p.image,p.published,p.created_at].map(literal).join(',')+')').join(',\n');
await fs.writeFile('supabase/seed.sql',sql+`insert into posts(slug,title,excerpt,content,image,published,created_at) values ${postRows} on conflict(slug) do nothing;\n`);console.log('Seed generated.');
