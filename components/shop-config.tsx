"use client";
import { createContext, useContext } from "react";
import {
  defaultHome,
  homeSchema,
  type HomeContent,
} from "@/lib/content-settings";
type ShopConfig = {
  name: string;
  home: HomeContent;
  freeShipping: number;
  categories: { id: string; name: string }[];
};
const Context = createContext<ShopConfig>({
  name: "ЕКО М’ЯТА",
  home: homeSchema.parse(defaultHome),
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
