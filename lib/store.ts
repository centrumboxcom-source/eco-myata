'use client';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {Product} from './data';
type CartItem={product:Product;quantity:number};
type Store={items:CartItem[];favorites:string[];cartOpen:boolean;add:(product:Product,quantity?:number)=>void;setQuantity:(id:string,quantity:number)=>void;clear:()=>void;setCartOpen:(open:boolean)=>void;toggleFavorite:(id:string)=>void};
export const useShop=create<Store>()(persist((set)=>({items:[],favorites:[],cartOpen:false,add:(product,quantity=1)=>set(s=>({items:s.items.some(i=>i.product.id===product.id)?s.items.map(i=>i.product.id===product.id?{...i,quantity:Math.min(product.stock,i.quantity+quantity)}:i):[...s.items,{product,quantity:Math.min(product.stock,quantity)}],cartOpen:true})),setQuantity:(id,quantity)=>set(s=>({items:quantity<=0?s.items.filter(i=>i.product.id!==id):s.items.map(i=>i.product.id===id?{...i,quantity:Math.min(i.product.stock,quantity)}:i)})),clear:()=>set({items:[]}),setCartOpen:cartOpen=>set({cartOpen}),toggleFavorite:id=>set(s=>({favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id]}))}),{name:'eko-myata-cart',partialize:s=>({items:s.items,favorites:s.favorites})}));
