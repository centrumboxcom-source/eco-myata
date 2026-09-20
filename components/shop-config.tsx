"use client";
import { createContext, useContext } from "react";
type ShopConfig = {
  freeShipping: number;
  categories: { id: string; name: string }[];
};
const Context = createContext<ShopConfig>({
  freeShipping: 1500,
  categories: [],
});
export const useShopConfig = () => useContext(Context);
export default function ShopConfigProvider({
  value,
  children,
}: {
  value: ShopConfig;
  children: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
