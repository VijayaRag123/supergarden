import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const navigate = vi.fn();
const signUp = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => signUp(...args) } },
}));
vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn() } },
}));

import { AuthForm } from "@/components/AuthForm";

function fillAndSubmit(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    "First name": "Asha",
    Surname: "Kumar",
    "Mobile number": "+919876543210",
    "Home address": "12 Main Road, Vanagaram, Chennai",
    "Email address": "asha@example.com",
    Password: "Garden-Fresh-42",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values))
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("Sign-up form", () => {
  beforeEach(() => {
    navigate.mockClear();
    signUp.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("sends the details to Supabase and shows the check-your-email message", async () => {
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "x" }] }, session: null },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fillAndSubmit();
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/asha@example\.com/)).toBeInTheDocument();
    const [payload] = signUp.mock.calls[0] ?? [];
    expect(payload).toMatchObject({
      email: "asha@example.com",
      password: "Garden-Fresh-42",
      options: { data: { first_name: "Asha", surname: "Kumar", mobile_number: "+919876543210" } },
    });
    expect(payload.options.data).not.toHaveProperty("password");
  });

  it("goes to the home page when Supabase signs the customer in straight away", async () => {
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "x" }] }, session: { access_token: "t" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fillAndSubmit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
  });

  it("does not claim success for an email that is already registered", async () => {
    signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    render(<AuthForm mode="signup" />);
    fillAndSubmit();
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Check your email" })).toBeNull();
  });

  it("shows a weak-password message under the password field", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "weak_password", status: 422, message: "Password is known to be weak" },
    });
    render(<AuthForm mode="signup" />);
    fillAndSubmit({ Password: "password123" });
    expect(await screen.findByText(/too easy to guess/)).toHaveAttribute("id", "password-error");
  });

  it("shows the rate-limit message instead of the generic failure", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "over_email_send_rate_limit",
        status: 429,
        message: "email rate limit exceeded",
      },
    });
    render(<AuthForm mode="signup" />);
    fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many sign-up attempts/);
    expect(screen.queryByText(/Could not create your account/)).toBeNull();
  });

  it("still shows the general message for an unknown error, and logs the real one", async () => {
    const failure = { code: "something_new", status: 400, message: "Unknown" };
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: failure });
    render(<AuthForm mode="signup" />);
    fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create your account. Please check your details or try logging in.",
    );
    expect(console.error).toHaveBeenCalledWith("Sign-up failed:", failure);
  });

  it("does not call Supabase when a field is invalid", async () => {
    render(<AuthForm mode="signup" />);
    fillAndSubmit({ "Mobile number": "12345" });
    expect(
      await screen.findByText("Enter 10–15 digits, with an optional + prefix."),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});
