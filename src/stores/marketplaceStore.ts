import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  basketProblems,
  buildOrderSnapshot,
  changeMarketQuantity,
  migrateLegacyLines,
  type MarketLine,
  type SampleOrder,
} from "@/lib/marketplace";

interface MarketState {
  lines: MarketLine[];
  lastOrder: SampleOrder | null;
  orderError: string | null;
  setQuantity: (shopId: string, productId: string, quantity: number) => void;
  placeSampleOrder: () => boolean;
  dismissOrder: () => void;
}

type SavedBasket = { lines: MarketLine[]; lastOrder: SampleOrder | null };
type LegacyLine = { shopId: string; productId: string; quantity: number };

export const useMarketplaceStore = create<MarketState>()(
  persist(
    (set, get) => ({
      lines: [],
      lastOrder: null,
      orderError: null,
      setQuantity: (shopId, productId, quantity) =>
        set((state) => ({
          lines: changeMarketQuantity(state.lines, shopId, productId, quantity),
          lastOrder: null,
          orderError: null,
        })),
      placeSampleOrder: () => {
        const { lines } = get();
        if (!lines.length) return false;
        if (basketProblems(lines).length) {
          set({
            orderError:
              "Some items are no longer available in the amount you chose. Please review your basket.",
          });
          return false;
        }
        // The order copies names and prices now, so it never changes when shop prices change later.
        set({
          lastOrder: buildOrderSnapshot(lines, `FM-${Date.now().toString(36).toUpperCase()}`),
          lines: [],
          orderError: null,
        });
        return true;
      },
      dismissOrder: () => set({ lastOrder: null }),
    }),
    {
      name: "fresh-market-local-basket",
      skipHydration: true,
      // Version 0 saved whole kilograms and orders without price snapshots. Version 1 saves grams and snapshots.
      version: 1,
      migrate: (persisted, version): SavedBasket => {
        if (version >= 1) return persisted as SavedBasket;
        const old = (persisted ?? {}) as {
          lines?: LegacyLine[];
          lastOrder?: { id: string; lines?: LegacyLine[] } | null;
        };
        const oldOrderLines = migrateLegacyLines(old.lastOrder?.lines ?? []);
        return {
          lines: migrateLegacyLines(old.lines ?? []),
          lastOrder:
            old.lastOrder && oldOrderLines.length
              ? buildOrderSnapshot(oldOrderLines, old.lastOrder.id)
              : null,
        };
      },
      partialize: (state): SavedBasket => ({ lines: state.lines, lastOrder: state.lastOrder }),
    },
  ),
);
