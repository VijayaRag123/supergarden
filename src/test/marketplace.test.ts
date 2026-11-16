import { afterEach, describe, expect, it } from "vitest";
import {
  shops,
  sampleProducts,
  changeMarketQuantity,
  groupMarketLines,
  marketTotal,
  lineTotal,
  formatQuantity,
  rupees,
  getListing,
  basketProblems,
  buildOrderSnapshot,
  migrateLegacyLines,
  listingOverrides,
  type ListingOverrides,
} from "@/lib/marketplace";
import { useMarketplaceStore } from "@/stores/marketplaceStore";

// Test data: two shops with their own prices and stock. Everything else uses the default sample price.
const overrides: ListingOverrides = {
  rajeshwari: { tomatoes: { price: 50 }, bananas: { stockQuantity: 1000 } },
  "bgs-farm-to-market": {
    tomatoes: { price: 30 },
    mangoes: { inStock: false },
    spinach: { listed: false },
  },
};

describe("Marketplace directory and catalog", () => {
  it("includes the nine requested shops in order", () => {
    expect(shops.map((s) => s.name)).toEqual([
      "Rajeshwari Vegetable Market (Rajeshwari Fruits & Veggies)",
      "BGS Farm To Market",
      "Nilam Fresh Store",
      "KASHNI & JEGADHA VEGETABLE SHOP",
      "V.S. Vegetables & Fruits",
      "Ooty Vegetables & Fruits",
      "Uma Fruits And Vegetable Store",
      "Jeyaraani Vegetables & Fruits Mart",
      "Kovai Pazhamudir Nilayam (KPN Fresh)",
    ]);
  });
  it("includes the ten requested produce types and both categories", () => {
    expect(sampleProducts.map((p) => p.id)).toEqual([
      "tomatoes",
      "onions",
      "potatoes",
      "carrots",
      "spinach",
      "bananas",
      "apples",
      "mangoes",
      "pomegranates",
      "oranges",
    ]);
    expect(sampleProducts.filter((p) => p.category === "Vegetables")).toHaveLength(5);
    expect(sampleProducts.filter((p) => p.category === "Fruits")).toHaveLength(5);
  });
});

describe("Per-shop prices and stock", () => {
  it("lets each shop have its own price for the same product", () => {
    expect(getListing("rajeshwari", "tomatoes", overrides)?.price).toBe(50);
    expect(getListing("bgs-farm-to-market", "tomatoes", overrides)?.price).toBe(30);
    expect(getListing("nilam-fresh", "tomatoes", overrides)?.price).toBe(40);
  });
  it("keeps the same product from different shops separate and prices each at its own shop", () => {
    let lines = changeMarketQuantity([], "rajeshwari", "tomatoes", 500, overrides);
    lines = changeMarketQuantity(lines, "bgs-farm-to-market", "tomatoes", 1000, overrides);
    expect(groupMarketLines(lines).map((g) => g.lines[0]?.quantity)).toEqual([500, 1000]);
    expect(marketTotal(lines, overrides)).toBe(55); // 0.5 kg x 50 + 1 kg x 30
  });
  it("rejects unknown shops, unknown products and unlisted products", () => {
    expect(changeMarketQuantity([], "no-such-shop", "tomatoes", 500, overrides)).toEqual([]);
    expect(changeMarketQuantity([], "rajeshwari", "no-such-product", 500, overrides)).toEqual([]);
    expect(changeMarketQuantity([], "bgs-farm-to-market", "spinach", 1, overrides)).toEqual([]);
  });
  it("does not let customers add an out-of-stock product", () => {
    expect(changeMarketQuantity([], "bgs-farm-to-market", "mangoes", 500, overrides)).toEqual([]);
  });
  it("limits the quantity to the stock left", () => {
    const lines = changeMarketQuantity([], "rajeshwari", "bananas", 1500, overrides);
    expect(lines[0]?.quantity).toBe(1000);
  });
  it("flags basket lines that are no longer available", () => {
    const lines = changeMarketQuantity([], "rajeshwari", "bananas", 1000, overrides);
    expect(basketProblems(lines, overrides)).toEqual([]);
    expect(basketProblems(lines, { rajeshwari: { bananas: { stockQuantity: 500 } } })).toEqual([
      { shopId: "rajeshwari", productId: "bananas", reason: "over-stock" },
    ]);
    expect(basketProblems(lines, { rajeshwari: { bananas: { inStock: false } } })).toEqual([
      { shopId: "rajeshwari", productId: "bananas", reason: "unavailable" },
    ]);
  });
  it("remembers the price the customer last saw", () => {
    expect(changeMarketQuantity([], "rajeshwari", "tomatoes", 250, overrides)[0]?.priceAtAdd).toBe(
      50,
    );
  });
});

describe("Fractional quantities", () => {
  it("sells kg products in 250 g steps", () => {
    for (const grams of [250, 500, 750, 1000, 1250])
      expect(changeMarketQuantity([], "nilam-fresh", "apples", grams)[0]?.quantity).toBe(grams);
    for (const grams of [1, 100, 251, 600])
      expect(changeMarketQuantity([], "nilam-fresh", "apples", grams)).toEqual([]);
  });
  it("sells bunch products as whole numbers", () => {
    expect(changeMarketQuantity([], "nilam-fresh", "spinach", 3)[0]?.quantity).toBe(3);
  });
  it("removes an item when its quantity reaches zero", () => {
    const lines = changeMarketQuantity([], "nilam-fresh", "apples", 250);
    expect(changeMarketQuantity(lines, "nilam-fresh", "apples", 0)).toEqual([]);
  });
  it("keeps an edited line in the same position", () => {
    let lines = changeMarketQuantity([], "nilam-fresh", "apples", 250);
    lines = changeMarketQuantity(lines, "nilam-fresh", "onions", 500);
    lines = changeMarketQuantity(lines, "nilam-fresh", "apples", 750);
    expect(lines.map((l) => l.productId)).toEqual(["apples", "onions"]);
  });
  it("shows quantities as grams under 1 kg and kg above", () => {
    expect(formatQuantity(250, "kg")).toBe("250 g");
    expect(formatQuantity(500, "kg")).toBe("500 g");
    expect(formatQuantity(1000, "kg")).toBe("1 kg");
    expect(formatQuantity(1250, "kg")).toBe("1.25 kg");
    expect(formatQuantity(1, "bunch")).toBe("1 bunch");
    expect(formatQuantity(3, "bunch")).toBe("3 bunches");
  });
});

describe("Prices and totals", () => {
  it("prices 250 g and 500 g correctly", () => {
    expect(lineTotal(40, 500, "kg")).toBe(20);
    expect(lineTotal(35, 250, "kg")).toBe(8.75);
    expect(lineTotal(180, 250, "kg")).toBe(45);
    expect(lineTotal(25, 3, "bunch")).toBe(75);
  });
  it("rounds to two decimals", () => {
    expect(lineTotal(33.33, 250, "kg")).toBe(8.33);
    expect(lineTotal(12.99, 750, "kg")).toBe(9.74);
  });
  it("shows paise only when needed", () => {
    expect(rupees(40)).toBe("₹40");
    expect(rupees(8.75)).toBe("₹8.75");
  });
  it("calculates a basket total from unit price and quantity", () => {
    const lines = [
      { shopId: "rajeshwari", productId: "onions", quantity: 3000 },
      { shopId: "nilam-fresh", productId: "spinach", quantity: 2 },
    ];
    expect(marketTotal(lines)).toBe(155); // 3 kg x 35 + 2 bunches x 25
  });
});

describe("Order snapshot", () => {
  afterEach(() => {
    for (const key of Object.keys(listingOverrides)) delete listingOverrides[key];
    useMarketplaceStore.setState({ lines: [], lastOrder: null, orderError: null });
  });

  it("copies shop, product, unit, price, quantity and totals", () => {
    const lines = changeMarketQuantity([], "rajeshwari", "tomatoes", 500);
    const order = buildOrderSnapshot(lines, "FM-1", "2026-11-16T00:00:00.000Z");
    expect(order).toEqual({
      id: "FM-1",
      placedAt: "2026-11-16T00:00:00.000Z",
      total: 20,
      lines: [
        {
          shopId: "rajeshwari",
          shopName: shops[0]?.name,
          productId: "tomatoes",
          productName: "Tomatoes",
          unit: "kg",
          unitPrice: 40,
          quantity: 500,
          lineTotal: 20,
        },
      ],
    });
  });
  it("keeps a placed order's total when the shop changes its price later", () => {
    const store = useMarketplaceStore.getState();
    store.setQuantity("rajeshwari", "tomatoes", 500);
    expect(useMarketplaceStore.getState().placeSampleOrder()).toBe(true);
    const placed = useMarketplaceStore.getState().lastOrder;
    expect(placed?.total).toBe(20);

    listingOverrides["rajeshwari"] = { tomatoes: { price: 99 } }; // price changes after the order
    const after = useMarketplaceStore.getState().lastOrder;
    expect(after?.total).toBe(20);
    expect(after?.lines[0]?.unitPrice).toBe(40);
    expect(marketTotal([{ shopId: "rajeshwari", productId: "tomatoes", quantity: 500 }])).toBe(
      49.5,
    ); // a new basket uses the new price
  });
  it("refuses to place an order when an item is no longer available", () => {
    const store = useMarketplaceStore.getState();
    store.setQuantity("rajeshwari", "tomatoes", 500);
    listingOverrides["rajeshwari"] = { tomatoes: { inStock: false } };
    expect(useMarketplaceStore.getState().placeSampleOrder()).toBe(false);
    expect(useMarketplaceStore.getState().orderError).toMatch(/no longer available/);
    expect(useMarketplaceStore.getState().lastOrder).toBeNull();
  });
});

describe("Upgrading baskets saved by the old version", () => {
  it("turns whole kg into grams and keeps counts as they are", () => {
    const upgraded = migrateLegacyLines([
      { shopId: "rajeshwari", productId: "tomatoes", quantity: 2 },
      { shopId: "nilam-fresh", productId: "spinach", quantity: 3 },
      { shopId: "no-such-shop", productId: "tomatoes", quantity: 1 },
      { shopId: "rajeshwari", productId: "onions", quantity: 0 },
    ]);
    expect(upgraded).toEqual([
      { shopId: "rajeshwari", productId: "tomatoes", quantity: 2000, priceAtAdd: 40 },
      { shopId: "nilam-fresh", productId: "spinach", quantity: 3, priceAtAdd: 25 },
    ]);
  });
});
