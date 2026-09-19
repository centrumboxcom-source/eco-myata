import type {Metadata} from 'next';
import './globals.css';
export const dynamic='force-dynamic';
import ShopTools from '@/components/webmcp';
import {getSettings} from '@/lib/settings';
import {getCategories} from '@/lib/catalog';
import ShopConfigProvider from '@/components/shop-config';
export async function generateMetadata():Promise<Metadata>{const settings=await getSettings();return {metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'),title:{default:settings.name+' — '+settings.description,template:'%s | '+settings.name},description:settings.description,openGraph:{locale:'uk_UA',type:'website',siteName:settings.name,images:['/og.png']},icons:{icon:'/favicon.svg'}};}
export default async function RootLayout({children}:{children:React.ReactNode}){const [settings,categories]=await Promise.all([getSettings(),getCategories()]);return <html lang="uk"><body><ShopConfigProvider value={{freeShipping:settings.free_shipping,categories}}><ShopTools/>{children}</ShopConfigProvider></body></html>}
