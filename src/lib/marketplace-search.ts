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
/** One product with every shop that sells it, cheapest first, so customers can compare prices. */
export interface ProductGroup {
  product: MarketProduct;
  /** In-stock shops first, then by price from lowest to highest, then by shop name. */
  offers: ProductHit[];
  /** Lowest and highest price among shops that have it in stock. null when no shop has it in stock. */
  minPrice: number | null;
  maxPrice: number | null;
  inStockCount: number;
}
export interface SearchResults {
  shops: ShopHit[];
  /** One entry per product and shop, kept for callers that want a flat list. */
  products: ProductHit[];
  /** The same product matches grouped by product, each with its price range and shops. */
  groups: ProductGroup[];
  /** How many more products were left out of `groups` to keep the list short. */
  moreGroups: number;
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

/** True when the two words differ by at most one inserted, deleted or changed letter ("tomatto" and "tomato"). */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * 3 = a word starts with the token, 2 = the token appears inside the text, 1 = it only matches with spaces
 * removed ("vs") or is a one-letter typo of a word (5+ letters), 0 = no match.
 */
function tokenScore(target: Searchable, token: string): number {
  const words = target.text.split(" ");
  if (words.some((word) => word.startsWith(token))) return 3;
  if (target.text.includes(token)) return 2;
  if (target.squashed.includes(token)) return 1;
  // Forgive one wrong, missing or extra letter in a whole word ("tomatoe", "caulifower"), but only for longer
  // words, since short ones would match unrelated shops.
  if (token.length >= 5 && words.some((w) => w.length >= 5 && withinOneEdit(w, token))) return 1;
  return 0;
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
  {
    maxShops = 4,
    maxProducts = 8,
    maxGroups = 4,
  }: { maxShops?: number; maxProducts?: number; maxGroups?: number } = {},
  overrides: ListingOverrides = listingOverrides,
): SearchResults {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (!tokens.length)
    return { shops: [], products: [], groups: [], moreGroups: 0, moreProducts: 0 };

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

  // Group the same matches by product so each product shows its lowest-to-highest price and its shops.
  const byProduct = new Map<string, { hits: ProductHit[]; score: number }>();
  for (const { hit, score } of productHits) {
    const entry = byProduct.get(hit.product.id) ?? { hits: [], score: 0 };
    entry.hits.push(hit); // productHits is already sorted cheapest, in-stock first
    entry.score = Math.max(entry.score, score);
    byProduct.set(hit.product.id, entry);
  }
  const allGroups: ProductGroup[] = [...byProduct.values()]
    .sort(
      (a, b) => b.score - a.score || a.hits[0]!.product.name.localeCompare(b.hits[0]!.product.name),
    )
    .map(({ hits }) => {
      const offers = [...hits].sort(
        (a, b) =>
          Number(b.listing.inStock) - Number(a.listing.inStock) ||
          a.listing.price - b.listing.price ||
          a.shop.name.localeCompare(b.shop.name),
      );
      const prices = offers.filter((o) => o.listing.inStock).map((o) => o.listing.price);
      return {
        product: offers[0]!.product,
        offers,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        inStockCount: prices.length,
      };
    });

  return {
    groups: allGroups.slice(0, maxGroups),
    moreGroups: Math.max(0, allGroups.length - maxGroups),
    shops: shopHits.slice(0, maxShops).map(({ shop }) => ({ shop })),
    products: productHits.slice(0, maxProducts).map(({ hit }) => hit),
    moreProducts: Math.max(0, productHits.length - maxProducts),
  };
}
