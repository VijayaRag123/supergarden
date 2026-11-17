import { describe, expect, it } from "vitest";
import { ALREADY_REGISTERED_MESSAGE, describeSignupError } from "@/lib/auth-errors";

describe("describeSignupError", () => {
  it("explains a weak or leaked password on the password field", () => {
    for (const error of [
      { code: "weak_password", status: 422, message: "Password should be at least 6 characters." },
      {
        status: 422,
        message: "Password is known to be weak and easy to guess, please choose a different one.",
      },
    ]) {
      const failure = describeSignupError(error);
      expect(failure.field).toBe("password");
      expect(failure.message).toMatch(/too easy to guess/);
    }
  });

  it("uses Supabase's reason to say whether the password is too short or too plain", () => {
    expect(describeSignupError({ code: "weak_password", reasons: ["length"] }).message).toMatch(
      /too short/,
    );
    expect(describeSignupError({ code: "weak_password", reasons: ["characters"] }).message).toMatch(
      /mix of letters/,
    );
    expect(
      describeSignupError({ code: "weak_password", reasons: ["length", "pwned"] }).message,
    ).toMatch(/data breach/);
    expect(describeSignupError({ code: "weak_password", reasons: ["pwned"] }).message).toMatch(
      /data breach/,
    );
  });

  it("tells the customer when the email is already registered", () => {
    expect(describeSignupError({ code: "user_already_exists", status: 422 })).toEqual({
      field: "email",
      message: ALREADY_REGISTERED_MESSAGE,
    });
    expect(describeSignupError({ message: "User already registered" }).field).toBe("email");
  });

  it("explains the email rate limit instead of a generic failure", () => {
    for (const error of [
      { code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" },
      {
        status: 429,
        message: "For security purposes, you can only request this after 45 seconds.",
      },
    ]) {
      const failure = describeSignupError(error);
      expect(failure.field).toBeUndefined();
      expect(failure.message).toMatch(/Too many sign-up attempts/);
    }
  });

  it("flags emails that Supabase will not accept", () => {
    expect(
      describeSignupError({
        code: "email_address_invalid",
        message: 'Email address "a@b.c" is invalid',
      }).field,
    ).toBe("email");
    expect(
      describeSignupError({
        code: "email_address_not_authorized",
        status: 400,
        message: "Email address not authorized",
      }).field,
    ).toBe("email");
  });

  it("handles sign-ups being turned off", () => {
    expect(
      describeSignupError({
        code: "signup_disabled",
        message: "Signups not allowed for this instance",
      }).message,
    ).toMatch(/turned off/);
  });

  it("points at the saved details when the profile could not be created", () => {
    for (const error of [
      { code: "unexpected_failure", status: 500, message: "Database error saving new user" },
      { message: "Database error saving new user" },
    ]) {
      expect(describeSignupError(error).message).toMatch(/couldn't save your account details/);
    }
  });

  it("explains a network problem", () => {
    expect(
      describeSignupError({
        name: "AuthRetryableFetchError",
        status: 0,
        message: "Failed to fetch",
      }).message,
    ).toMatch(/can't reach the server/);
    expect(describeSignupError(new TypeError("Failed to fetch")).message).toMatch(
      /can't reach the server/,
    );
  });

  it("falls back to the general message for anything else, including non-errors", () => {
    for (const error of [
      { code: "something_new", status: 400, message: "Unknown" },
      null,
      undefined,
      "oops",
      42,
    ]) {
      expect(describeSignupError(error)).toEqual({
        message: "Could not create your account. Please check your details or try logging in.",
      });
    }
  });
});
