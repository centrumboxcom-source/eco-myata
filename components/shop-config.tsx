"use client";
import { createContext, useContext } from "react";
import {
  defaultHome,
  homeSchema,
  type HomeContent,
} from "@/lib/content-settings";
import {
  defaultCommerce,
  formatPrice,
  type CommerceSettings,
} from "@/lib/commerce-settings";
type ShopConfig = {
  commerce: CommerceSettings;
  name: string;
  home: HomeContent;
  freeShipping: number;
  categories: { id: string; name: string }[];
};
const Context = createContext<ShopConfig>({
  commerce: defaultCommerce,
  name: "ЕКО М’ЯТА",
  home: homeSchema.parse(defaultHome),
  freeShipping: 1500,
  categories: [],
});
export const useShopConfig = () => useContext(Context);
export function usePrice() {
  const { commerce } = useShopConfig();
  return (amount: number) => formatPrice(amount, commerce);
}
export default function ShopConfigProvider({
  value,
  children,
}: {
  value: ShopConfig;
  children: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
