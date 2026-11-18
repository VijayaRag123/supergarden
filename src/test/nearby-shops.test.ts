import { describe, expect, it } from "vitest";
import {
  cleanPincode,
  distanceKm,
  formatDistance,
  isValidPincode,
  localPincodePoint,
  shopPincode,
  shopsNear,
} from "@/lib/nearby-shops";
import { shops } from "@/lib/marketplace";
import { shopLocations } from "@/lib/shop-locations";

describe("PIN codes", () => {
  it("accepts six digits that do not start with 0", () => {
    expect(isValidPincode("600095")).toBe(true);
    expect(isValidPincode(" 600095 ")).toBe(true);
    for (const bad of ["", "60009", "6000955", "060095", "60009a"])
      expect(isValidPincode(bad)).toBe(false);
  });
  it("cleans typed text to at most six digits", () => {
    expect(cleanPincode("600 095")).toBe("600095");
    expect(cleanPincode("6000951234")).toBe("600095");
    expect(cleanPincode("abc")).toBe("");
  });
  it("reads the PIN code from a shop address", () => {
    expect(shopPincode("Vanagaram, Chennai 600095")).toBe("600095");
    expect(shopPincode("Nearest Branches: Mogappair, Anna Nagar")).toBeNull();
  });
});

describe("distance", () => {
  it("is zero for the same place and about 111 km per degree of latitude", () => {
    const p = { lat: 13.05, lng: 80.15 };
    expect(distanceKm(p, p)).toBe(0);
    expect(distanceKm(p, { lat: 14.05, lng: 80.15 })).toBeCloseTo(111.2, 0);
  });
  it("is the same in both directions", () => {
    const a = { lat: 13.0, lng: 80.1 };
    const b = { lat: 13.1, lng: 80.2 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });
  it("formats metres and kilometres", () => {
    expect(formatDistance(0.004)).toBe("10 m");
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(2.44)).toBe("2.4 km");
    expect(formatDistance(27.4)).toBe("27 km");
  });
});

describe("shopsNear", () => {
  it("lists the nearest shop first", () => {
    const atNilam = shopLocations["nilam-fresh"]!;
    const result = shopsNear(atNilam);
    expect(result[0]!.shop.id).toBe("nilam-fresh");
    expect(result[0]!.km).toBeCloseTo(0, 5);
    const kms = result.map((r) => r.km);
    expect(kms).toEqual([...kms].sort((a, b) => a - b));
  });
  it("leaves out shops beyond the range and shops with no known location", () => {
    expect(shopsNear({ lat: 28.6, lng: 77.2 })).toEqual([]); // Delhi
    const some = { "nilam-fresh": shopLocations["nilam-fresh"]! };
    const result = shopsNear(shopLocations["nilam-fresh"]!, { locations: some });
    expect(result.map((r) => r.shop.id)).toEqual(["nilam-fresh"]);
  });
  it("has a location for every shop in the directory", () => {
    for (const s of shops) expect(shopLocations[s.id], s.id).toBeDefined();
  });
});

describe("localPincodePoint", () => {
  it("finds a PIN code our shops use, without any network call", () => {
    const p = localPincodePoint("600095");
    expect(p).not.toBeNull();
    expect(shopsNear(p!)[0]!.km).toBeLessThan(5);
  });
  it("returns null for a PIN code none of our shops use", () => {
    expect(localPincodePoint("110001")).toBeNull();
  });
});
