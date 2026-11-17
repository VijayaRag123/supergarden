import {
  getListing,
  listingOverrides,
  sampleProducts,
  shops,
  type ListingOverrides,
  type MarketProduct,
  type MarketShop,
  type ShopListing,
} from "@/lib/marketplace";

/** A shop that matches the search. */
export interface ShopHit {
  shop: MarketShop;
}
/** A product sold by a specific shop, with that shop's own price and stock. */
export interface ProductHit {
  product: MarketProduct;
  shop: MarketShop;
  listing: ShopListing;
}
export interface SearchResults {
  shops: ShopHit[];
  products: ProductHit[];
  /** How many more product matches were left out to keep the list short. */
  moreProducts: number;
}

interface Searchable {
  text: string;
  squashed: string;
}

/** Lower-case, drop accents and punctuation, and collapse spaces: "V.S. Vegetables" becomes "v s vegetables". */
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const prepare = (value: string): Searchable => {
  const text = normalizeSearch(value);
  return { text, squashed: text.replace(/ /g, "") };
};

/** 3 = a word starts with the token, 2 = the token appears inside the text, 1 = it only matches with spaces removed ("vs"), 0 = no match. */
function tokenScore(target: Searchable, token: string): number {
  if (target.text.split(" ").some((word) => word.startsWith(token))) return 3;
  if (target.text.includes(token)) return 2;
  return target.squashed.includes(token) ? 1 : 0;
}

const searchableShops = shops.map((shop) => ({
  shop,
  target: prepare(`${shop.name} ${shop.area}`),
}));
const searchableProducts = sampleProducts.map((product) => ({
  product,
  target: prepare(`${product.name} ${product.category}`),
}));

export function searchMarketplace(
  query: string,
  { maxShops = 4, maxProducts = 8 }: { maxShops?: number; maxProducts?: number } = {},
  overrides: ListingOverrides = listingOverrides,
): SearchResults {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (!tokens.length) return { shops: [], products: [], moreProducts: 0 };

  const shopHits = searchableShops
    .flatMap(({ shop, target }) => {
      const scores = tokens.map((t) => tokenScore(target, t));
      return scores.every((s) => s > 0) ? [{ shop, score: scores.reduce((a, b) => a + b, 0) }] : [];
    })
    .sort((a, b) => b.score - a.score);

  // A product result is one product at one shop, so "tomato" lists every shop that sells tomatoes and
  // "tomato nilam" narrows it to that shop. At least one word must match the product itself.
  const productHits = searchableProducts.flatMap(({ product, target: productTarget }) =>
    searchableShops.flatMap(({ shop, target: shopTarget }) => {
      const listing = getListing(shop.id, product.id, overrides);
      if (!listing || !listing.listed) return [];
      const perToken = tokens.map((t) => ({
        p: tokenScore(productTarget, t),
        s: tokenScore(shopTarget, t),
      }));
      if (!perToken.some(({ p }) => p > 0) || !perToken.every(({ p, s }) => p > 0 || s > 0))
        return [];
      const score = perToken.reduce((sum, { p, s }) => sum + Math.max(p * 2, s), 0);
      return [{ hit: { product, shop, listing }, score }];
    }),
  );
  productHits.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.hit.listing.inStock) - Number(a.hit.listing.inStock) ||
      a.hit.listing.price - b.hit.listing.price ||
      a.hit.shop.name.localeCompare(b.hit.shop.name),
  );

  return {
    shops: shopHits.slice(0, maxShops).map(({ shop }) => ({ shop })),
    products: productHits.slice(0, maxProducts).map(({ hit }) => hit),
    moreProducts: Math.max(0, productHits.length - maxProducts),
  };
}
