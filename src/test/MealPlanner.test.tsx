import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const getMealPlan = vi.fn();
let user: { id: string } | null = { id: "u1" };
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => ({}),
}));
vi.mock("@/lib/meal-plan.functions", () => ({
  getMealPlan: (...a: unknown[]) => getMealPlan(...a),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user, loading: false }) }));

import { MealPlanner } from "@/components/MealPlanner";
import { useMarketplaceStore } from "@/stores/marketplaceStore";

const open = () => fireEvent.click(screen.getByRole("button", { name: /Plan my week/ }));

describe("MealPlanner", () => {
  beforeEach(() => {
    getMealPlan.mockReset();
    user = { id: "u1" };
    useMarketplaceStore.setState({ lines: [], lastOrder: null, orderError: null });
  });
  afterEach(cleanup);

  it("asks signed-out customers to log in", () => {
    user = null;
    render(<MealPlanner />);
    open();
    expect(screen.getByRole("link", { name: "log in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("Your request")).toBeNull();
  });

  it("shows the suggested basket and only adds it after the customer confirms", async () => {
    getMealPlan.mockResolvedValue({
      ok: true,
      plan: {
        summary: "A simple week.",
        unavailable: ["paneer"],
        dishes: [
          {
            name: "Sambar",
            items: [
              { productId: "tomatoes", quantity: 500 },
              { productId: "onions", quantity: 250 },
            ],
          },
        ],
      },
    });
    render(<MealPlanner />);
    open();
    fireEvent.change(screen.getByLabelText("Your request"), {
      target: { value: "what can I cook this week?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Suggest basket/ }));

    expect(await screen.findByText("A simple week.")).toBeInTheDocument();
    expect(getMealPlan).toHaveBeenCalledWith({ data: { request: "what can I cook this week?" } });
    expect(screen.getByText("500 g")).toBeInTheDocument();
    expect(screen.getByText(/Not available: paneer/)).toBeInTheDocument();
    expect(useMarketplaceStore.getState().lines).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Add to basket" }));
    const lines = useMarketplaceStore.getState().lines;
    expect(lines.map((l) => [l.productId, l.quantity]).sort()).toEqual([
      ["onions", 250],
      ["tomatoes", 500],
    ]);
    expect(screen.getByRole("button", { name: "Added to basket" })).toBeDisabled();
  });

  it("shows the error and leaves the basket alone when the planner fails", async () => {
    getMealPlan.mockResolvedValue({
      ok: false,
      error: "AI credits have run out. Please try again later.",
    });
    render(<MealPlanner />);
    open();
    fireEvent.change(screen.getByLabelText("Your request"), { target: { value: "dinner ideas" } });
    fireEvent.click(screen.getByRole("button", { name: /Suggest basket/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/credits/);
    await waitFor(() => expect(useMarketplaceStore.getState().lines).toHaveLength(0));
  });
});
