import { describe, expect, it } from "vitest";
import { shops, sampleProducts, changeMarketQuantity, groupMarketLines, marketTotal } from "@/lib/marketplace";

describe("Marketplace rules", () => {
  it("includes the nine requested shops in order", () => {
    expect(shops.map(s => s.name)).toEqual(["Rajeshwari Vegetable Market (Rajeshwari Fruits & Veggies)", "BGS Farm To Market", "Nilam Fresh Store", "KASHNI & JEGADHA VEGETABLE SHOP", "V.S. Vegetables & Fruits", "Ooty Vegetables & Fruits", "Uma Fruits And Vegetable Store", "Jeyaraani Vegetables & Fruits Mart", "Kovai Pazhamudir Nilayam (KPN Fresh)"]);
  });
  it("keeps the same product from different shops separate", () => {
    let lines = changeMarketQuantity([], "rajeshwari", "tomatoes", 2);
    lines = changeMarketQuantity(lines, "bgs-farm-to-market", "tomatoes", 1);
    expect(groupMarketLines(lines).map(g => g.lines[0]?.quantity)).toEqual([2, 1]);
    expect(marketTotal(lines)).toBe(120);
  });
  it("removes an item when its quantity reaches zero", () => {
    const lines = changeMarketQuantity([], "nilam-fresh", "apples", 1);
    expect(changeMarketQuantity(lines, "nilam-fresh", "apples", 0)).toEqual([]);
  });
  it("calculates rupee subtotals from unit price and quantity", () => {
    expect(marketTotal([{shopId:"rajeshwari",productId:"onions",quantity:3},{shopId:"nilam-fresh",productId:"spinach",quantity:2}])).toBe(155);
  });
  it("includes the ten requested produce types and both categories", () => {
    expect(sampleProducts.map(p => p.id)).toEqual(["tomatoes","onions","potatoes","carrots","spinach","bananas","apples","mangoes","pomegranates","oranges"]);
    expect(sampleProducts.filter(p => p.category === "Vegetables")).toHaveLength(5);
    expect(sampleProducts.filter(p => p.category === "Fruits")).toHaveLength(5);
  });
});