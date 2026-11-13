import { create } from "zustand";
import { persist } from "zustand/middleware";
import { changeMarketQuantity, type MarketLine } from "@/lib/marketplace";

interface MarketState {
  lines: MarketLine[];
  lastOrder: { id: string; lines: MarketLine[] } | null;
  setQuantity: (shopId: string, productId: string, quantity: number) => void;
  placeSampleOrder: () => void;
  dismissOrder: () => void;
}
export const useMarketplaceStore = create<MarketState>()(persist((set, get) => ({
  lines: [], lastOrder: null,
  setQuantity: (shopId, productId, quantity) => set(state => ({ lines: changeMarketQuantity(state.lines, shopId, productId, quantity), lastOrder: null })),
  placeSampleOrder: () => {
    if (!get().lines.length) return;
    set({ lastOrder: { id: `FM-${Date.now().toString(36).toUpperCase()}`, lines: get().lines.map(l => ({ ...l })) }, lines: [] });
  },
  dismissOrder: () => set({ lastOrder: null }),
}), { name: "fresh-market-local-basket", skipHydration: true, partialize: state => ({ lines: state.lines, lastOrder: state.lastOrder }) }));