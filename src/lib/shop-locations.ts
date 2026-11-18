/**
 * Where each shop is, as latitude and longitude.
 *
 * IMPORTANT: these are APPROXIMATE, placed at the middle of each shop's neighbourhood, so distances are only
 * accurate to roughly a kilometre or two. For exact results, open each shop in Google Maps, right-click the
 * shop and click the coordinates to copy them, then paste them here. A shop missing from this list is simply
 * left out of "near me" results.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

export const shopLocations: Record<string, GeoPoint> = {
  rajeshwari: { lat: 13.107, lng: 80.119 }, // Ayyapakkam / Kil Ayanambakkam
  "bgs-farm-to-market": { lat: 13.088, lng: 80.129 }, // Mel Ayanambakkam
  "nilam-fresh": { lat: 13.058, lng: 80.147 }, // Vanagaram
  "kashni-jegadha": { lat: 13.059, lng: 80.15 }, // Vanagaram
  "vs-vegetables": { lat: 13.105, lng: 80.14 }, // Ambattur (ICF Colony)
  ooty: { lat: 13.087, lng: 80.17 }, // Mogappair West
  uma: { lat: 13.078, lng: 80.16 }, // Nolambur
  jeyaraani: { lat: 13.115, lng: 80.156 }, // Ambattur (EB Colony)
  "kpn-fresh": { lat: 13.087, lng: 80.175 }, // Mogappair (several branches)
};
