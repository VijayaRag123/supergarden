import shopRows from "./marketplace-shops.json";
import tomatoes from "@/assets/products/tomatoes.jpg";
import onions from "@/assets/products/onions.jpg";
import potatoes from "@/assets/products/potatoes.jpg";
import carrots from "@/assets/products/carrots.jpg";
import spinach from "@/assets/products/spinach.jpg";
import bananas from "@/assets/products/bananas.jpg";
import apples from "@/assets/products/apples.jpg";
import mangoes from "@/assets/products/mangoes.jpg";
import pomegranates from "@/assets/products/pomegranates.jpg";
import oranges from "@/assets/products/oranges.jpg";

export const shops = shopRows;
export type MarketShop = (typeof shops)[number];

/** How a product is sold. "kg" products are stored in grams; "bunch" and "piece" are whole counts. */
export type Unit = "kg" | "bunch" | "piece";
export interface MarketProduct {
  id: string;
  name: string;
  category: "Vegetables" | "Fruits";
  price: number;
  unit: Unit;
  image: string;
}

// Illustrative catalog only: the uploaded workbook supplies directory details, not inventory or prices.
// `price` here is the default price (rupees per unit) that every shop uses unless it has an override below.
export const sampleProducts: MarketProduct[] = [
  {
    id: "tomatoes",
    name: "Tomatoes",
    category: "Vegetables",
    price: 40,
    unit: "kg",
    image: tomatoes,
  },
  { id: "onions", name: "Onions", category: "Vegetables", price: 35, unit: "kg", image: onions },
  {
    id: "potatoes",
    name: "Potatoes",
    category: "Vegetables",
    price: 45,
    unit: "kg",
    image: potatoes,
  },
  { id: "carrots", name: "Carrots", category: "Vegetables", price: 60, unit: "kg", image: carrots },
  {
    id: "spinach",
    name: "Spinach / Keerai",
    category: "Vegetables",
    price: 25,
    unit: "bunch",
    image: spinach,
  },
  { id: "bananas", name: "Bananas", category: "Fruits", price: 60, unit: "kg", image: bananas },
  { id: "apples", name: "Apples", category: "Fruits", price: 180, unit: "kg", image: apples },
  { id: "mangoes", name: "Mangoes", category: "Fruits", price: 120, unit: "kg", image: mangoes },
  {
    id: "pomegranates",
    name: "Pomegranates",
    category: "Fruits",
    price: 160,
    unit: "kg",
    image: pomegranates,
  },
  { id: "oranges", name: "Oranges", category: "Fruits", price: 80, unit: "kg", image: oranges },
];
export const findProduct = (productId: string) => sampleProducts.find((p) => p.id === productId);

// ---------- Per-shop prices and stock ----------
export interface ShopListing {
  /** Rupees per unit (per kg for "kg" products). */
  price: number;
  inStock: boolean;
  /** Stock left in base units (grams for "kg" products, counts otherwise). null = unlimited. */
  stockQuantity: number | null;
  /** false hides the product from that shop's page. */
  listed: boolean;
}
export type ListingOverrides = Record<string, Record<string, Partial<ShopListing>>>;

/**
 * Each shop's own price/stock changes, keyed by shop id then product id. Anything not listed here uses the
 * default sample price, in stock, unlimited. Fill this in with each shop's real data, for example:
 *   "bgs-farm-to-market": { tomatoes: { price: 38 }, mangoes: { inStock: false }, spinach: { listed: false } },
 *   "nilam-fresh": { bananas: { stockQuantity: 20000 } }, // 20 kg left
 */
export const listingOverrides: ListingOverrides = {};

export function getListing(
  shopId: string,
  productId: string,
  overrides: ListingOverrides = listingOverrides,
): ShopListing | null {
  const product = findProduct(productId);
  if (!product || !shops.some((s) => s.id === shopId)) return null;
  const o = overrides[shopId]?.[productId];
  return {
    price: o?.price ?? product.price,
    inStock: o?.inStock ?? true,
    stockQuantity: o?.stockQuantity ?? null,
    listed: o?.listed ?? true,
  };
}

// ---------- Quantities (base units: grams for "kg", counts for "bunch" / "piece") ----------
const STEP: Record<Unit, number> = { kg: 250, bunch: 1, piece: 1 };
/** Smallest amount a customer can add or remove at a time (250 g for kg products). */
export const quantityStep = (unit: Unit) => STEP[unit];
/** Quick-pick amounts shown next to the +/- buttons. */
export const quickQuantities = (unit: Unit) => (unit === "kg" ? [250, 500, 1000] : []);

export function formatQuantity(quantity: number, unit: Unit) {
  if (unit === "kg")
    return quantity < 1000 ? `${quantity} g` : `${Number((quantity / 1000).toFixed(3))} kg`;
  if (unit === "bunch") return `${quantity} ${quantity === 1 ? "bunch" : "bunches"}`;
  return `${quantity} ${quantity === 1 ? "piece" : "pieces"}`;
}

/** The most a customer can order from this shop right now, in base units (0 = cannot order). */
export function maxQuantity(listing: ShopListing, unit: Unit) {
  if (!listing.listed || !listing.inStock) return 0;
  if (listing.stockQuantity === null) return Infinity;
  const step = quantityStep(unit);
  return Math.floor(Math.max(0, listing.stockQuantity) / step) * step;
}

// ---------- Money ----------
export const rupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

/** Line cost in paise (whole numbers, so there are no floating-point rounding surprises). */
export function linePaise(price: number, quantity: number, unit: Unit) {
  return Math.round((Math.round(price * 100) * quantity) / (unit === "kg" ? 1000 : 1));
}
export const lineTotal = (price: number, quantity: number, unit: Unit) =>
  linePaise(price, quantity, unit) / 100;

// ---------- Basket ----------
export interface MarketLine {
  shopId: string;
  productId: string;
  /** Base units: grams for "kg" products, counts for "bunch" / "piece". */
  quantity: number;
  /** The price the customer last saw when changing this line. Used to show "Price updated". */
  priceAtAdd?: number;
}

export function changeMarketQuantity(
  lines: MarketLine[],
  shopId: string,
  productId: string,
  quantity: number,
  overrides: ListingOverrides = listingOverrides,
): MarketLine[] {
  const product = findProduct(productId);
  const listing = getListing(shopId, productId, overrides);
  if (!product || !listing || !Number.isSafeInteger(quantity)) return lines;
  if (quantity <= 0) return lines.filter((l) => l.shopId !== shopId || l.productId !== productId);
  const max = maxQuantity(listing, product.unit);
  if (max === 0 || quantity % quantityStep(product.unit) !== 0) return lines;
  const next: MarketLine = {
    shopId,
    productId,
    quantity: Math.min(quantity, max),
    priceAtAdd: listing.price,
  };
  const exists = lines.some((l) => l.shopId === shopId && l.productId === productId);
  return exists
    ? lines.map((l) => (l.shopId === shopId && l.productId === productId ? next : l))
    : [...lines, next];
}

/** Basket total in rupees at the shops' current prices. */
export function marketTotal(lines: MarketLine[], overrides: ListingOverrides = listingOverrides) {
  const paise = lines.reduce((sum, l) => {
    const product = findProduct(l.productId);
    const listing = getListing(l.shopId, l.productId, overrides);
    return product && listing ? sum + linePaise(listing.price, l.quantity, product.unit) : sum;
  }, 0);
  return paise / 100;
}

export function groupMarketLines(lines: MarketLine[]) {
  return shops
    .map((shop) => ({ shop, lines: lines.filter((l) => l.shopId === shop.id) }))
    .filter((g) => g.lines.length > 0);
}

export interface BasketProblem {
  shopId: string;
  productId: string;
  reason: "unavailable" | "over-stock";
}
/** Lines that can no longer be ordered as chosen (item removed, out of stock, or more than the stock left). */
export function basketProblems(
  lines: MarketLine[],
  overrides: ListingOverrides = listingOverrides,
): BasketProblem[] {
  return lines.flatMap((l): BasketProblem[] => {
    const product = findProduct(l.productId);
    const listing = getListing(l.shopId, l.productId, overrides);
    const max = product && listing ? maxQuantity(listing, product.unit) : 0;
    if (max === 0) return [{ shopId: l.shopId, productId: l.productId, reason: "unavailable" }];
    return l.quantity > max
      ? [{ shopId: l.shopId, productId: l.productId, reason: "over-stock" }]
      : [];
  });
}

// ---------- Order snapshot ----------
/** A saved order line. Names and prices are copied at order time, so later price changes never alter it. */
export interface OrderLine {
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  unit: Unit;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
export interface SampleOrder {
  id: string;
  placedAt: string;
  lines: OrderLine[];
  total: number;
}

export function buildOrderSnapshot(
  lines: MarketLine[],
  id: string,
  placedAt: string = new Date().toISOString(),
  overrides: ListingOverrides = listingOverrides,
): SampleOrder {
  const orderLines = lines.flatMap((l) => {
    const shop = shops.find((s) => s.id === l.shopId);
    const product = findProduct(l.productId);
    const listing = getListing(l.shopId, l.productId, overrides);
    if (!shop || !product || !listing) return [];
    return [
      {
        shopId: shop.id,
        shopName: shop.name,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        unitPrice: listing.price,
        quantity: l.quantity,
        lineTotal: lineTotal(listing.price, l.quantity, product.unit),
      },
    ];
  });
  const total = orderLines.reduce((sum, l) => sum + Math.round(l.lineTotal * 100), 0) / 100;
  return { id, placedAt, lines: orderLines, total };
}

// ---------- Upgrading baskets saved by the old version ----------
/** Old baskets stored whole kilograms (2 = 2 kg). New baskets store grams, so kg lines are multiplied by 1000. */
export function migrateLegacyLines(
  lines: { shopId: string; productId: string; quantity: number }[],
): MarketLine[] {
  return lines.flatMap((l) => {
    const product = findProduct(l.productId);
    const listing = getListing(l.shopId, l.productId);
    if (!product || !listing) return [];
    const quantity = product.unit === "kg" ? l.quantity * 1000 : l.quantity;
    return Number.isSafeInteger(quantity) && quantity > 0
      ? [{ shopId: l.shopId, productId: l.productId, quantity, priceAtAdd: listing.price }]
      : [];
  });
}
