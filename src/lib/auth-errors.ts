/** What to show the customer when sign-up fails, and which field it belongs to (if any). */
export interface SignupFailure {
  field?: "email" | "password";
  message: string;
}

export const ALREADY_REGISTERED_MESSAGE =
  "An account with this email already exists. Try logging in, or reset your password.";

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/**
 * Turns an error from supabase.auth.signUp into a clear message. Supabase reports a short `code`
 * (for example "weak_password"); older versions only send a text message, so both are checked.
 */
export function describeSignupError(error: unknown): SignupFailure {
  const e = record(error);
  const code = typeof e["code"] === "string" ? e["code"] : "";
  const status = typeof e["status"] === "number" ? e["status"] : undefined;
  const name = typeof e["name"] === "string" ? e["name"] : "";
  const text = typeof e["message"] === "string" ? e["message"].toLowerCase() : "";

  if (code === "weak_password" || /weak|easy to guess|known to be|pwned/.test(text)) {
    // Supabase lists why the password was refused: "length", "characters" (not enough variety) or "pwned" (found in a breach).
    const reasons = Array.isArray(e["reasons"]) ? e["reasons"].map(String) : [];
    const tooShort = reasons.includes("length");
    const needsMix = reasons.includes("characters");
    const message =
      tooShort && !reasons.includes("pwned")
        ? "That password is too short. Use a longer one."
        : needsMix && !reasons.includes("pwned")
          ? "That password needs a mix of letters, numbers and symbols."
          : "That password is too easy to guess or has appeared in a data breach. Choose a longer, less common one.";
    return { field: "password", message };
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    /already (been )?registered|already exists/.test(text)
  ) {
    return { field: "email", message: ALREADY_REGISTERED_MESSAGE };
  }
  if (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    /rate limit|too many requests|security purposes/.test(text)
  ) {
    return {
      message:
        "Too many sign-up attempts or confirmation emails were sent recently. Please wait a while and try again, or use a different email address.",
    };
  }
  if (code === "email_address_invalid" || /email address .*invalid|invalid .*email/.test(text)) {
    return {
      field: "email",
      message: "This email address is not accepted. Please use a different one.",
    };
  }
  if (code === "email_address_not_authorized" || /not authorized/.test(text)) {
    return {
      field: "email",
      message:
        "We can't send a confirmation email to this address yet. Please use a different email address.",
    };
  }
  if (code === "signup_disabled" || /signups? (are |is )?(not allowed|disabled)/.test(text)) {
    return { message: "Sign-ups are turned off right now. Please try again later." };
  }
  if (code === "unexpected_failure" || /database error saving new user/.test(text)) {
    return {
      message:
        "We couldn't save your account details. Please check your name, mobile number and address, then try again.",
    };
  }
  if (
    name === "AuthRetryableFetchError" ||
    status === 0 ||
    /failed to fetch|network|load failed/.test(text)
  ) {
    return { message: "We can't reach the server. Check your internet connection and try again." };
  }
  return { message: "Could not create your account. Please check your details or try logging in." };
}
