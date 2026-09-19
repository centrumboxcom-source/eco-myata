import type {MetadataRoute} from 'next';
import {getSettings} from '@/lib/settings';
export const dynamic='force-dynamic';
export default async function robots():Promise<MetadataRoute.Robots>{const s=await getSettings();return {rules:{userAgent:'*',allow:s.seo_visible?'/':undefined,disallow:s.seo_visible?['/admin','/account','/checkout','/api']:['/']},sitemap:(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000')+'/sitemap.xml'}}
