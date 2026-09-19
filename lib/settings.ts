import {serviceClient} from './server';
export const defaultSettings={name:'ЕКО М’ЯТА',description:'Крамниця природної користі',email:'',phone:'',instagram:'',iban:'',recipient:'',seo_visible:false,np:true,ukr:true,courier:true,cod:true,mono:false,liqpay:false,bank:false,free_shipping:1500};
export type Settings=typeof defaultSettings;
export async function getSettings():Promise<Settings>{const client=serviceClient();if(!client)return defaultSettings;const {data,error}=await client.from('settings').select('value').eq('id','store').maybeSingle();if(error)throw error;return {...defaultSettings,...data?.value};}
