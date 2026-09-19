import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const dist=path.resolve(root,'dist');
if(path.dirname(dist)!==root)throw new Error('Invalid staging path');
await fs.rm(dist,{recursive:true,force:true});
await fs.mkdir('dist/server',{recursive:true});
await fs.mkdir('dist/client',{recursive:true});
// Bundle only the deployment runtime; source credentials and environment files are excluded.
await fs.copyFile('.sites-runtime/worker/worker.js','dist/server/index.js');
await fs.cp('.open-next/assets','dist/client',{recursive:true});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Sites worker staged:',(await fs.stat(path.join(root,'dist/server/index.js'))).size,'bytes');
