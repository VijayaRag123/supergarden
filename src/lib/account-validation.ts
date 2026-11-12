import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(255);
export const passwordSchema = z.string().min(6, "Use at least 6 characters.").max(128, "Use no more than 128 characters.");
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(128) });
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: z.string().trim().min(1, "Enter your first name.").max(100),
  surname: z.string().trim().min(1, "Enter your surname.").max(100),
  mobile_number: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter 10–15 digits, with an optional + prefix."),
  home_address: z.string().trim().min(1, "Enter your home address.").max(500),
  date_of_birth: z.string().refine((value) => {
    if (!value) return true;
    const date = new Date(value + "T00:00:00");
    return !Number.isNaN(date.getTime()) && date.getFullYear() >= 1900 && date <= new Date() && value === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, "Choose a valid birthday that is not in the future."),
  gender: z.enum(["", "female", "male", "other", "prefer_not_to_say"]),
});
export const resetPasswordSchema = z.object({ password: passwordSchema, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export function checkoutWithProfile(url: string, profile: { first_name: string; surname: string; mobile_number: string; home_address: string }, email?: string) {
  const checkout = new URL(url);
  if (email) checkout.searchParams.set("checkout[email]", emailSchema.parse(email));
  const fields = { first_name: profile.first_name, last_name: profile.surname, phone: profile.mobile_number, address1: profile.home_address };
  for (const [key, value] of Object.entries(fields)) {
    if (value) checkout.searchParams.set(`checkout[shipping_address][${key}]`, value);
  }
  return checkout.toString();
}