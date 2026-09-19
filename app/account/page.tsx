import {Header,Footer} from '@/components/shop';
import Account from '@/components/account';
export const metadata={title:'Особистий кабінет',robots:{index:false,follow:false}};
export default function Page(){return <><Header/><Account/><Footer/></>}
