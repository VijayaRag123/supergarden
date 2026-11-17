import { describe, expect, it } from "vitest";
import {
  addPlanToBasket,
  cleanRequest,
  resolvePlan,
  sanitizePlan,
  MAX_REQUEST_CHARS,
  type MealPlan,
} from "@/lib/meal-plan";
import { shops, type ListingOverrides } from "@/lib/marketplace";

const firstShop = shops[0]!.id;
const secondShop = shops[1]!.id;

const plan = (dishes: MealPlan["dishes"], unavailable: string[] = []): MealPlan => ({
  summary: "Here you go",
  dishes,
  unavailable,
});

describe("sanitizePlan", () => {
  it("drops products the shops don't sell and bad quantities", () => {
    const clean = sanitizePlan(
      plan([
        {
          name: "Curry",
          items: [
            { productId: "tomatoes", quantity: 500 },
            { productId: "paneer", quantity: 200 },
            { productId: "onions", quantity: -5 },
            { productId: "carrots", quantity: Number.NaN },
          ],
        },
        { name: "Empty", items: [{ productId: "nope", quantity: 1 }] },
      ]),
    );
    expect(clean.dishes).toEqual([
      { name: "Curry", items: [{ productId: "tomatoes", quantity: 500 }] },
    ]);
  });

  it("rounds to the selling step and caps silly amounts", () => {
    const clean = sanitizePlan(
      plan([
        {
          name: "Big",
          items: [
            { productId: "tomatoes", quantity: 130 }, // below one step -> 250 g
            { productId: "onions", quantity: 600 }, // -> 500 g
            { productId: "potatoes", quantity: 500000 }, // capped at 10 kg
            { productId: "spinach", quantity: 2.6 }, // -> 3 bunches
            { productId: "oranges", quantity: 1000 }, // oranges unit decided by catalog
          ],
        },
      ]),
    );
    const q = Object.fromEntries(clean.dishes[0]!.items.map((i) => [i.productId, i.quantity]));
    expect(q["tomatoes"]).toBe(250);
    expect(q["onions"]).toBe(500);
    expect(q["potatoes"]).toBe(10000);
    expect(q["spinach"]).toBe(3);
  });
});

describe("resolvePlan", () => {
  it("adds up an item used by several dishes and lists the dishes", () => {
    const { lines } = resolvePlan(
      plan([
        { name: "Sambar", items: [{ productId: "tomatoes", quantity: 250 }] },
        { name: "Rasam", items: [{ productId: "tomatoes", quantity: 500 }] },
      ]),
      {},
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      productId: "tomatoes",
      quantity: 750,
      dishes: ["Sambar", "Rasam"],
      total: 30,
    });
  });

  it("buys from the cheapest shop that has the item in stock", () => {
    const overrides: ListingOverrides = {
      [firstShop]: { tomatoes: { price: 50 } },
      [secondShop]: { tomatoes: { price: 30 } },
    };
    const { lines } = resolvePlan(
      plan([{ name: "Curry", items: [{ productId: "tomatoes", quantity: 1000 }] }]),
      overrides,
    );
    expect(lines[0]).toMatchObject({ shopId: secondShop, price: 30, total: 30 });
  });

  it("skips shops that are out of stock or don't list the item, and reports items nobody has", () => {
    const everywhere = Object.fromEntries(
      shops.map((s) => [s.id, { mangoes: { inStock: false } }]),
    );
    const { lines, skipped } = resolvePlan(
      plan([
        {
          name: "Dessert",
          items: [
            { productId: "mangoes", quantity: 1000 },
            { productId: "apples", quantity: 500 },
          ],
        },
      ]),
      everywhere,
    );
    expect(lines.map((l) => l.productId)).toEqual(["apples"]);
    expect(skipped).toEqual(["Mangoes"]);
  });

  it("reduces the amount to the stock the shop has left", () => {
    const limited = Object.fromEntries(
      shops.map((s) => [s.id, { tomatoes: { stockQuantity: 500 } }]),
    );
    const { lines } = resolvePlan(
      plan([{ name: "Curry", items: [{ productId: "tomatoes", quantity: 2000 }] }]),
      limited,
    );
    expect(lines[0]).toMatchObject({ quantity: 500, reducedForStock: true });
  });
});

describe("addPlanToBasket", () => {
  it("adds to what is already in the basket", () => {
    const { lines } = resolvePlan(
      plan([{ name: "Curry", items: [{ productId: "tomatoes", quantity: 500 }] }]),
      {},
    );
    const first = lines[0]!;
    const basket = addPlanToBasket(
      [{ shopId: first.shopId, productId: "tomatoes", quantity: 250 }],
      lines,
      {},
    );
    expect(basket).toEqual([
      expect.objectContaining({ shopId: first.shopId, productId: "tomatoes", quantity: 750 }),
    ]);
  });
});

describe("cleanRequest", () => {
  it("tidies spaces and limits the length", () => {
    expect(cleanRequest("  what   can I \n cook? ")).toBe("what can I cook?");
    expect(cleanRequest("a".repeat(2000))).toHaveLength(MAX_REQUEST_CHARS);
    expect(cleanRequest(undefined)).toBe("");
  });
});
