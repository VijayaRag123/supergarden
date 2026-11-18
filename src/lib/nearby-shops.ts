import { shops, type MarketShop } from "@/lib/marketplace";
import { shopLocations, type GeoPoint } from "@/lib/shop-locations";

/** Shops further away than this are not treated as "near". */
export const MAX_NEAR_KM = 50;

/** An Indian PIN code is six digits and never starts with 0. */
export const isValidPincode = (value: string) => /^[1-9]\d{5}$/.test(value.trim());

/** Keep only digits and at most six of them, so typing "600 095" or "600095." still works. */
export const cleanPincode = (value: string) => value.replace(/\D/g, "").slice(0, 6);

/** Straight-line distance between two points, in kilometres (haversine formula). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "850 m" under a kilometre, otherwise "2.4 km" (or "27 km" from 10 km up). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** The six-digit PIN code at the end of a shop's address, if it has one. */
export function shopPincode(address: string): string | null {
  const found = address.match(/\b[1-9]\d{5}\b/g);
  return found ? found[found.length - 1]! : null;
}

/**
 * A PIN code's position worked out from our own shops that use it (the middle of those shops).
 * Works without a network call for the PIN codes the shops are in. Returns null for any other PIN code.
 */
export function localPincodePoint(
  pincode: string,
  list: MarketShop[] = shops,
  locations: Record<string, GeoPoint> = shopLocations,
): GeoPoint | null {
  const points = list
    .filter((s) => shopPincode(s.address) === pincode.trim())
    .flatMap((s) => (locations[s.id] ? [locations[s.id]!] : []));
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  };
}

export interface NearbyShop {
  shop: MarketShop;
  km: number;
}

/** Shops with a known location, nearest first. Shops further than `maxKm` are left out. */
export function shopsNear(
  origin: GeoPoint,
  {
    maxKm = MAX_NEAR_KM,
    list = shops,
    locations = shopLocations,
  }: { maxKm?: number; list?: MarketShop[]; locations?: Record<string, GeoPoint> } = {},
): NearbyShop[] {
  return list
    .flatMap((shop) => {
      const at = locations[shop.id];
      return at ? [{ shop, km: distanceKm(origin, at) }] : [];
    })
    .filter(({ km }) => km <= maxKm)
    .sort((a, b) => a.km - b.km || a.shop.name.localeCompare(b.shop.name));
}
