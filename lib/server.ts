import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
export const configured=()=>!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export async function sessionClient(){if(!configured())return null;const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:(values)=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options))}catch{}}}})}
export function serviceClient(){if(!configured()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return null;return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function requireAdmin(){const client=await sessionClient();if(!client)throw new Error('SUPABASE_NOT_CONFIGURED');const {data:{user}}=await client.auth.getUser();if(!user)throw new Error('UNAUTHORIZED');const {data}=await client.from('profiles').select('role').eq('id',user.id).single();if(data?.role!=='admin')throw new Error('FORBIDDEN');return {client,user};}
export function safeError(error:unknown){const m=error instanceof Error?error.message:'';return {message:m==='UNAUTHORIZED'?'Увійдіть у свій обліковий запис.':m==='FORBIDDEN'?'Доступ лише для адміністратора.':m==='SUPABASE_NOT_CONFIGURED'?'Потрібно підключити Supabase.':'Не вдалося зберегти зміни. Спробуйте ще раз.',status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:m==='SUPABASE_NOT_CONFIGURED'?503:400}}
