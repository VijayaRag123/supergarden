import { describe, expect, it } from "vitest";
import { normalizeSearch, searchMarketplace } from "@/lib/marketplace-search";
import type { ListingOverrides } from "@/lib/marketplace";

const ids = (r: ReturnType<typeof searchMarketplace>) => ({
  shops: r.shops.map((h) => h.shop.id),
  products: r.products.map((h) => `${h.product.id}@${h.shop.id}`),
});

describe("normalizeSearch", () => {
  it("lower-cases, removes accents and punctuation, and collapses spaces", () => {
    expect(normalizeSearch("  V.S.  Vegetables & Fruits ")).toBe("v s vegetables fruits");
    expect(normalizeSearch("Café")).toBe("cafe");
  });
});

describe("searchMarketplace: finding shops", () => {
  it("finds a shop by part of its name, ignoring case", () => {
    expect(ids(searchMarketplace("NILAM")).shops).toEqual(["nilam-fresh"]);
    expect(ids(searchMarketplace("farm to")).shops).toEqual(["bgs-farm-to-market"]);
  });
  it("finds shops by area", () => {
    expect(ids(searchMarketplace("mogappair")).shops.sort()).toEqual(["kpn-fresh", "ooty"]);
  });
  it("finds a shop whose name has dots or ampersands", () => {
    expect(ids(searchMarketplace("v.s.")).shops).toContain("vs-vegetables");
    expect(ids(searchMarketplace("vs")).shops).toContain("vs-vegetables");
    expect(ids(searchMarketplace("kashni jegadha")).shops).toEqual(["kashni-jegadha"]);
  });
  it("does not list a shop name as an item result", () => {
    expect(searchMarketplace("nilam").products).toEqual([]);
  });
});

describe("searchMarketplace: finding items", () => {
  it("lists every shop that sells an item, with that shop's own price", () => {
    const overrides: ListingOverrides = { rajeshwari: { tomatoes: { price: 50 } } };
    const result = searchMarketplace("tomato", { maxProducts: 20 }, overrides);
    expect(result.shops).toEqual([]);
    expect(result.products).toHaveLength(9);
    expect(result.products.every((h) => h.product.id === "tomatoes")).toBe(true);
    expect(result.products.find((h) => h.shop.id === "rajeshwari")?.listing.price).toBe(50);
    expect(result.products.find((h) => h.shop.id === "nilam-fresh")?.listing.price).toBe(40);
  });
  it("matches the local name and the category", () => {
    expect(ids(searchMarketplace("keerai", { maxProducts: 20 })).products[0]).toMatch(/^spinach@/);
    expect(
      searchMarketplace("fruits", { maxProducts: 100 }).products.some(
        (h) => h.product.id === "mangoes",
      ),
    ).toBe(true);
  });
  it("narrows an item to one shop when a shop name is added", () => {
    expect(ids(searchMarketplace("tomato nilam"))).toEqual({
      shops: [],
      products: ["tomatoes@nilam-fresh"],
    });
    expect(ids(searchMarketplace("nilam tomato")).products).toEqual(["tomatoes@nilam-fresh"]);
  });
  it("puts word matches ahead of matches inside a word", () => {
    // "to" starts "tomatoes" but only appears inside "potatoes"
    const order = searchMarketplace("to", { maxProducts: 100 }).products.map((h) => h.product.id);
    expect(order.indexOf("tomatoes")).toBeLessThan(order.indexOf("potatoes"));
  });
  it("skips products a shop does not list", () => {
    const overrides: ListingOverrides = { "bgs-farm-to-market": { tomatoes: { listed: false } } };
    const result = searchMarketplace("tomato", { maxProducts: 20 }, overrides);
    expect(result.products).toHaveLength(8);
    expect(result.products.some((h) => h.shop.id === "bgs-farm-to-market")).toBe(false);
  });
  it("shows in-stock and cheaper shops first", () => {
    const overrides: ListingOverrides = {
      rajeshwari: { tomatoes: { price: 30, inStock: false } },
      "nilam-fresh": { tomatoes: { price: 45 } },
      "kpn-fresh": { tomatoes: { price: 35 } },
    };
    const order = ids(searchMarketplace("tomato", { maxProducts: 20 }, overrides)).products;
    expect(order[0]).toBe("tomatoes@kpn-fresh");
    expect(order.indexOf("tomatoes@nilam-fresh")).toBeGreaterThan(
      order.indexOf("tomatoes@kpn-fresh"),
    );
    expect(order[order.length - 1]).toBe("tomatoes@rajeshwari"); // cheapest, but out of stock
  });
  it("limits the list and says how many were left out", () => {
    const result = searchMarketplace("tomato", { maxProducts: 3 });
    expect(result.products).toHaveLength(3);
    expect(result.moreProducts).toBe(6);
  });
});

describe("searchMarketplace: empty and unknown searches", () => {
  it("returns nothing for blank, punctuation-only or unknown text", () => {
    for (const q of ["", "   ", "&&&", "zzzz"])
      expect(searchMarketplace(q)).toEqual({
        shops: [],
        products: [],
        groups: [],
        moreGroups: 0,
        moreProducts: 0,
      });
  });
});

describe("searchMarketplace: price comparison", () => {
  const overrides: ListingOverrides = {
    rajeshwari: { tomatoes: { price: 30, inStock: false } },
    "nilam-fresh": { tomatoes: { price: 45 } },
    "kpn-fresh": { tomatoes: { price: 35 } },
  };
  it("groups an item's shops with the lowest and highest in-stock price", () => {
    const { groups } = searchMarketplace("tomato", {}, overrides);
    expect(groups).toHaveLength(1);
    const g = groups[0]!;
    expect(g.product.id).toBe("tomatoes");
    expect(g.minPrice).toBe(35); // the cheaper Rajeshwari price is out of stock
    expect(g.maxPrice).toBe(45);
    expect(g.inStockCount).toBe(8);
    expect(g.offers[0]!.shop.id).toBe("kpn-fresh");
    const inStockPrices = g.offers.filter((o) => o.listing.inStock).map((o) => o.listing.price);
    expect(inStockPrices).toEqual([...inStockPrices].sort((a, b) => a - b));
    expect(g.offers[g.offers.length - 1]!.shop.id).toBe("rajeshwari");
  });
  it("reports no price range when nobody has the item in stock", () => {
    const none: ListingOverrides = Object.fromEntries(
      [
        "rajeshwari",
        "nilam-fresh",
        "kpn-fresh",
        "uma",
        "ooty",
        "vs-vegetables",
        "kashni-jegadha",
        "bgs-farm-to-market",
      ].map((id) => [id, { tomatoes: { inStock: false } }]),
    );
    const g = searchMarketplace("tomato", {}, none).groups[0]!;
    expect(g.inStockCount).toBeLessThan(9);
    const all: ListingOverrides = {};
    for (const o of g.offers) all[o.shop.id] = { tomatoes: { inStock: false } };
    const empty = searchMarketplace("tomato", {}, all).groups[0]!;
    expect(empty.minPrice).toBeNull();
    expect(empty.maxPrice).toBeNull();
  });
  it("lists only the named shop when a shop is added to the search", () => {
    const g = searchMarketplace("tomato nilam", {}, overrides).groups[0]!;
    expect(g.offers.map((o) => o.shop.id)).toEqual(["nilam-fresh"]);
    expect(g.minPrice).toBe(45);
    expect(g.maxPrice).toBe(45);
  });
  it("limits groups and counts the rest", () => {
    const r = searchMarketplace("fruits", { maxGroups: 1 });
    expect(r.groups).toHaveLength(1);
    expect(r.moreGroups).toBeGreaterThan(0);
  });
});

describe("searchMarketplace: small typos", () => {
  it("still finds an item with one wrong or extra letter in a longer word", () => {
    expect(searchMarketplace("tomatoe").groups[0]?.product.id).toBe("tomatoes");
    expect(searchMarketplace("tomatos").groups[0]?.product.id).toBe("tomatoes");
  });
  it("does not guess on short words", () => {
    expect(searchMarketplace("tomx").groups).toEqual([]);
  });
});
