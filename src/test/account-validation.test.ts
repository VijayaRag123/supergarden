import { describe, expect, it } from "vitest";
import { signupSchema, passwordSchema, resetPasswordSchema, checkoutWithProfile } from "@/lib/account-validation";

const customer = { first_name: "Asha", surname: "Rao", mobile_number: "+919876543210", home_address: "12 Garden Street", email: "asha@example.com", password: "fresh123", date_of_birth: "1995-02-15", gender: "female" };

describe("Customer account rules", () => {
  it("requires all customer contact fields", () => {
    expect(signupSchema.safeParse(customer).success).toBe(true);
    for (const field of ["first_name", "surname", "mobile_number", "home_address", "email", "password"]) {
      expect(signupSchema.safeParse({ ...customer, [field]: "" }).success).toBe(false);
    }
  });
  it("requires at least six password characters", () => {
    expect(passwordSchema.safeParse("12345").success).toBe(false);
    expect(passwordSchema.safeParse("123456").success).toBe(true);
  });
  it("validates phone digits", () => {
    expect(signupSchema.safeParse({ ...customer, mobile_number: "abc123" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...customer, mobile_number: "9876543210" }).success).toBe(true);
  });
  it("rejects future and impossible birthdays", () => {
    expect(signupSchema.safeParse({ ...customer, date_of_birth: "2999-01-01" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...customer, date_of_birth: "1995-02-31" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...customer, date_of_birth: "", gender: "" }).success).toBe(true);
  });
  it("requires matching reset passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: "fresh123", confirmPassword: "different" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "fresh123", confirmPassword: "fresh123" }).success).toBe(true);
  });
  it("pre-fills saved delivery name, phone, address and email without losing cart parameters", () => {
    const url = new URL(checkoutWithProfile("https://example.myshopify.com/checkouts/abc?key=cart", customer, customer.email));
    expect(url.searchParams.get("checkout[shipping_address][first_name]")).toBe("Asha");
    expect(url.searchParams.get("checkout[shipping_address][last_name]")).toBe("Rao");
    expect(url.searchParams.get("checkout[shipping_address][phone]")).toBe("+919876543210");
    expect(url.searchParams.get("checkout[shipping_address][address1]")).toBe("12 Garden Street");
    expect(url.searchParams.get("checkout[email]")).toBe("asha@example.com");
    expect(url.searchParams.get("key")).toBe("cart");
  });
});