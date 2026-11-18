import type { GeoPoint } from "@/lib/shop-locations";

export type PincodeResult = { ok: true; point: GeoPoint } | { ok: false; error: string };

/**
 * Finds the middle of an Indian PIN code using OpenStreetMap's free Nominatim service (no API key).
 * Its usage policy allows light use only (about one request per second, with a real User-Agent), so the
 * caller checks our own shops' PIN codes first and only comes here for other ones.
 * For heavy traffic, swap this one function for a paid geocoder such as the Google Geocoding API.
 */
export async function geocodePincode(pincode: string): Promise<PincodeResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("postalcode", pincode);
    url.searchParams.set("country", "India");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: { "User-Agent": "FreshMarket/1.0 (pincode lookup)", Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { ok: false, error: "Could not look up that PIN code right now." };
    const rows = (await res.json()) as { lat?: string; lon?: string }[];
    const lat = Number(rows[0]?.lat);
    const lng = Number(rows[0]?.lon);
    if (!rows.length || !Number.isFinite(lat) || !Number.isFinite(lng))
      return { ok: false, error: "We could not find that PIN code. Please check it." };
    return { ok: true, point: { lat, lng } };
  } catch {
    return { ok: false, error: "Could not look up that PIN code right now." };
  }
}
