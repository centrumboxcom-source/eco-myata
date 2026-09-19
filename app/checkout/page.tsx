import Link from 'next/link';
import {Header,Footer} from '@/components/shop';
import Checkout from '@/components/checkout';
import {configured} from '@/lib/server';
import {getSettings} from '@/lib/settings';
export const metadata={title:'Оформлення замовлення',robots:{index:false,follow:false}};
export default async function Page(){const s=await getSettings();return <><Header/><main className="container"><div className="breadcrumb"><Link href="/">Головна</Link> / Оформлення замовлення</div><h1 className="page-title">Майже у вас 🌿</h1><Checkout configured={configured()} methods={{np:s.np,ukr:s.ukr,courier:s.courier,cod:s.cod,mono:s.mono&&!!process.env.MONOBANK_TOKEN,liqpay:s.liqpay&&!!process.env.LIQPAY_PRIVATE_KEY,bank:s.bank&&!!s.iban}} freeShipping={s.free_shipping}/></main><Footer/></>}

export const dynamic='force-dynamic';
