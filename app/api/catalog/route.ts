import {NextResponse} from 'next/server';
import {getProducts} from '@/lib/catalog';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json(await getProducts(),{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({message:'Не вдалося завантажити каталог.'},{status:503})}}
