import {createClient} from '@supabase/supabase-js';
import {products,categories,type Product} from './data';
export async function getProducts():Promise<Product[]>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return products;const client=createClient(url,key);const {data,error}=await client.from('products').select('*').eq('active',true).order('created_at',{ascending:false});if(error)throw new Error('Не вдалося завантажити каталог');return data as Product[];}

export async function getCategories():Promise<{id:string;name:string;parent_id?:string;sort_order?:number;color?:string}[]>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return categories;const {data,error}=await createClient(url,key).from('categories').select('*').order('sort_order');if(error)throw error;return data;}
