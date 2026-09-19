import Link from 'next/link';
import {Header,Footer} from '@/components/shop';
import {ShieldCheck} from 'lucide-react';
export const metadata={title:'Статус оплати',robots:{index:false,follow:false}};
export default function Page(){return <><Header/><main className="empty-state" style={{minHeight:'60vh'}}><ShieldCheck size={60}/><h1>Дякуємо за ваше замовлення</h1><p>Підтвердження оплати надходить безпосередньо від банку.<br/>Актуальний статус можна уточнити в особистому кабінеті або у крамниці.</p><Link href="/account" className="button">Мої замовлення</Link><Link href="/contacts">Зв’язатися з крамницею</Link></main><Footer/></>}
