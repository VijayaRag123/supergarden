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
export interface MarketProduct { id: string; name: string; category: "Vegetables" | "Fruits"; price: number; unit: string; image: string }
// Illustrative catalog only: the uploaded workbook supplies directory details, not inventory or prices.
export const sampleProducts: MarketProduct[] = [
  { id: "tomatoes", name: "Tomatoes", category: "Vegetables", price: 40, unit: "kg", image: tomatoes },
  { id: "onions", name: "Onions", category: "Vegetables", price: 35, unit: "kg", image: onions },
  { id: "potatoes", name: "Potatoes", category: "Vegetables", price: 45, unit: "kg", image: potatoes },
  { id: "carrots", name: "Carrots", category: "Vegetables", price: 60, unit: "kg", image: carrots },
  { id: "spinach", name: "Spinach / Keerai", category: "Vegetables", price: 25, unit: "bunch", image: spinach },
  { id: "bananas", name: "Bananas", category: "Fruits", price: 60, unit: "kg", image: bananas },
  { id: "apples", name: "Apples", category: "Fruits", price: 180, unit: "kg", image: apples },
  { id: "mangoes", name: "Mangoes", category: "Fruits", price: 120, unit: "kg", image: mangoes },
  { id: "pomegranates", name: "Pomegranates", category: "Fruits", price: 160, unit: "kg", image: pomegranates },
  { id: "oranges", name: "Oranges", category: "Fruits", price: 80, unit: "kg", image: oranges },
];
export interface MarketLine { shopId: string; productId: string; quantity: number }
export const rupees = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
export function changeMarketQuantity(lines: MarketLine[], shopId: string, productId: string, quantity: number): MarketLine[] {
  if (!shops.some(s => s.id === shopId) || !sampleProducts.some(p => p.id === productId) || !Number.isSafeInteger(quantity)) return lines;
  const others = lines.filter(l => l.shopId !== shopId || l.productId !== productId);
  return quantity > 0 ? [...others, { shopId, productId, quantity }] : others;
}
export function marketTotal(lines: MarketLine[]) {
  return lines.reduce((sum, l) => sum + (sampleProducts.find(p => p.id === l.productId)?.price ?? 0) * l.quantity, 0);
}
export function groupMarketLines(lines: MarketLine[]) {
  return shops.map(shop => ({ shop, lines: lines.filter(l => l.shopId === shop.id) })).filter(g => g.lines.length > 0);
}