import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getPosts} from '@/lib/posts';
import {Header,Footer} from '@/components/shop';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=(await getPosts()).find(x=>x.slug===slug);return p?{title:p.title,description:p.excerpt,openGraph:{title:p.title,description:p.excerpt,images:[p.image],type:'article'},twitter:{card:'summary_large_image',title:p.title,description:p.excerpt,images:[p.image]}}:{title:'Статтю не знайдено'};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=(await getPosts()).find(x=>x.slug===slug);if(!p)notFound();return <><Header/><article className="container content-page"><div className="breadcrumb"><Link href="/blog">Блог</Link> / Історія</div><span className="eyebrow">{new Date(p.created_at).toLocaleDateString('uk-UA')} · ЕКО М’ЯТА</span><h1 className="page-title">{p.title}</h1><p>{p.excerpt}</p><div style={{position:'relative',height:380,borderRadius:12,overflow:'hidden',margin:'28px 0'}}><Image src={p.image} alt={p.title} fill priority sizes="850px"/></div>{p.content.split('\n\n').map((text,i)=>text.length<60&&i>0?<h2 key={i}>{text}</h2>:<p key={i}>{text}</p>)}<Link href="/catalog" className="button" style={{marginTop:20}}>Обрати інгредієнти</Link></article><Footer/></>}

export const dynamic='force-dynamic';
