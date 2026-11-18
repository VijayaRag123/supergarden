import { createServerFn } from "@tanstack/react-start";
import { isValidPincode, cleanPincode } from "@/lib/nearby-shops";
import { geocodePincode } from "@/lib/geocode.server";

/** Turns a PIN code into a map position. Open to everyone, so signed-out visitors can find nearby shops. */
export const lookupPincode = createServerFn({ method: "POST" })
  .inputValidator((input: { pincode: string }) => {
    const pincode = cleanPincode(String(input?.pincode ?? ""));
    if (!isValidPincode(pincode)) throw new Error("Enter a 6-digit PIN code.");
    return { pincode };
  })
  .handler(async ({ data }) => geocodePincode(data.pincode));
