import type { Metadata } from "next";

import { MarketPage } from "@/components/market/market-page";

export const metadata: Metadata = { title: "Market | Aurum" };

export default function Market() {
  return <MarketPage />;
}
