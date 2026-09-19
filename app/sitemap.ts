import type {MetadataRoute} from 'next';
import {getProducts} from '@/lib/catalog';
import {getPosts} from '@/lib/posts';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const origin=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';const [products,posts]=await Promise.all([getProducts(),getPosts()]);return [...['','/catalog','/blog','/delivery','/contacts','/privacy'].map(p=>({url:origin+p,changeFrequency:'weekly' as const,priority:p===''?1:0.7})),...products.map(p=>({url:origin+'/product/'+p.slug,changeFrequency:'weekly' as const,priority:0.8})),...posts.map(p=>({url:origin+'/blog/'+p.slug,lastModified:new Date(p.created_at),priority:0.6}))]}
