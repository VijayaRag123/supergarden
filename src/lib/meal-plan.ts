import { z } from "zod";
import {
  changeMarketQuantity,
  findProduct,
  getListing,
  lineTotal,
  listingOverrides,
  maxQuantity,
  quantityStep,
  sampleProducts,
  shops,
  type ListingOverrides,
  type MarketLine,
} from "@/lib/marketplace";

/** Longest request (typed or spoken) we send to the model. */
export const MAX_REQUEST_CHARS = 500;
/** Most one product can be planned at once: 10 kg, or 20 bunches/pieces. A guard against silly model output. */
const MAX_KG_GRAMS = 10_000;
const MAX_COUNT = 20;

/** What the model must return. Quantities are in base units: grams for kg products, counts otherwise. */
export const mealPlanSchema = z.object({
  summary: z.string(),
  dishes: z.array(
    z.object({
      name: z.string(),
      items: z.array(z.object({ productId: z.string(), quantity: z.number() })),
    }),
  ),
  /** Things the shopper asked for that the shops don't sell. */
  unavailable: z.array(z.string()),
});
export type MealPlan = z.infer<typeof mealPlanSchema>;

/** The catalog as the model sees it: ids to choose from, and how each item is measured. */
export function catalogForPrompt() {
  return sampleProducts.map((p) => ({
    productId: p.id,
    name: p.name,
    quantityUnit: p.unit === "kg" ? "grams" : p.unit === "bunch" ? "bunches" : "pieces",
    pricePerUnit: p.price,
  }));
}

export const MEAL_PLAN_INSTRUCTIONS = [
  "You are a friendly greengrocer's assistant for an Indian fruit and vegetable marketplace.",
  "The shopper either asks for meal ideas (for example 'what can I cook this week?') or lists what they want to buy (for example 'two kilos of tomatoes and a bunch of spinach').",
  "Use ONLY productId values from the catalog. Never invent products. Put anything the shops don't sell in `unavailable`.",
  "For meal ideas: choose a few simple dishes that fit the request and the number of people, and list the catalog items each needs. Do not list pantry items (oil, spices, rice, dal) because the shops don't sell them.",
  "For a direct shopping list: return one dish named 'Your order' containing exactly what was asked for.",
  "Quantities are whole numbers in the catalog's quantityUnit: grams for kg-sold items (use multiples of 250), bunches or pieces otherwise.",
  "The summary is one or two short sentences. Keep the plan small and realistic.",
].join(" ");

/** Rounds to the selling step, keeps it between one step and the cap. Returns null for unusable numbers. */
function normalizeQuantity(quantity: number, unit: "kg" | "bunch" | "piece"): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const step = quantityStep(unit);
  const rounded = Math.max(step, Math.round(quantity / step) * step);
  return Math.min(rounded, unit === "kg" ? MAX_KG_GRAMS : MAX_COUNT);
}

/** Drops products that don't exist and fixes quantities, so nothing the model invents reaches the basket. */
export function sanitizePlan(plan: MealPlan): MealPlan {
  return {
    summary: plan.summary.trim().slice(0, 400),
    unavailable: plan.unavailable
      .map((u) => u.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 10),
    dishes: plan.dishes.slice(0, 7).flatMap((dish) => {
      const items = dish.items.flatMap((item) => {
        const product = findProduct(item.productId);
        const quantity = product ? normalizeQuantity(item.quantity, product.unit) : null;
        return product && quantity ? [{ productId: product.id, quantity }] : [];
      });
      return items.length ? [{ name: dish.name.trim().slice(0, 80) || "Dish", items }] : [];
    }),
  };
}

export interface PlannedLine {
  productId: string;
  productName: string;
  shopId: string;
  shopName: string;
  /** Base units, ready for the basket. */
  quantity: number;
  /** Rupees per unit at the chosen shop. */
  price: number;
  total: number;
  /** Which dishes use this item. */
  dishes: string[];
  /** True when the shop has less stock than the plan asked for. */
  reducedForStock: boolean;
}

/**
 * Turns a plan into basket lines. The same product from several dishes is added up, then bought from the
 * cheapest shop that has it listed and in stock (first shop wins a tie).
 */
export function resolvePlan(
  plan: MealPlan,
  overrides: ListingOverrides = listingOverrides,
): { lines: PlannedLine[]; skipped: string[] } {
  const wanted = new Map<string, { quantity: number; dishes: string[] }>();
  for (const dish of sanitizePlan(plan).dishes) {
    for (const item of dish.items) {
      const entry = wanted.get(item.productId) ?? { quantity: 0, dishes: [] };
      entry.quantity += item.quantity;
      if (!entry.dishes.includes(dish.name)) entry.dishes.push(dish.name);
      wanted.set(item.productId, entry);
    }
  }

  const lines: PlannedLine[] = [];
  const skipped: string[] = [];
  for (const [productId, entry] of wanted) {
    const product = findProduct(productId);
    if (!product) continue;
    const options = shops.flatMap((shop) => {
      const listing = getListing(shop.id, productId, overrides);
      const max = listing ? maxQuantity(listing, product.unit) : 0;
      return listing && max > 0 ? [{ shop, listing, max }] : [];
    });
    const best = options.reduce<(typeof options)[number] | undefined>(
      (a, b) => (!a || b.listing.price < a.listing.price ? b : a),
      undefined,
    );
    if (!best) {
      skipped.push(product.name);
      continue;
    }
    const cap = product.unit === "kg" ? MAX_KG_GRAMS : MAX_COUNT;
    const quantity = Math.min(entry.quantity, cap, best.max);
    lines.push({
      productId,
      productName: product.name,
      shopId: best.shop.id,
      shopName: best.shop.name,
      quantity,
      price: best.listing.price,
      total: lineTotal(best.listing.price, quantity, product.unit),
      dishes: entry.dishes,
      reducedForStock: quantity < entry.quantity,
    });
  }
  return { lines, skipped };
}

/** Adds the planned items to the basket, on top of anything already there for the same shop and product. */
export function addPlanToBasket(
  basket: MarketLine[],
  planned: PlannedLine[],
  overrides: ListingOverrides = listingOverrides,
): MarketLine[] {
  return planned.reduce((lines, p) => {
    const existing = lines.find((l) => l.shopId === p.shopId && l.productId === p.productId);
    return changeMarketQuantity(
      lines,
      p.shopId,
      p.productId,
      (existing?.quantity ?? 0) + p.quantity,
      overrides,
    );
  }, basket);
}

/** Cleans what the shopper typed or said before it goes to the model. */
export function cleanRequest(text: unknown): string {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REQUEST_CHARS);
}
