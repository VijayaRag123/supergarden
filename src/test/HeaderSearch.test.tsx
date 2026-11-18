import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

import { HeaderSearch } from "@/components/HeaderSearch";

const box = () => screen.getByRole("combobox", { name: "Search shops and items" });
const type = (value: string) => fireEvent.change(box(), { target: { value } });

describe("HeaderSearch", () => {
  beforeEach(() => navigate.mockClear());
  afterEach(cleanup);

  it("shows nothing until something is typed", () => {
    render(<HeaderSearch />);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(box());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows shops and items in separate groups", () => {
    render(<HeaderSearch />);
    type("o");
    expect(screen.getByText("Shops")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    // Shops come first, so the first option is a shop.
    expect(screen.getAllByRole("option")[0]).toHaveTextContent(/^\S.*/);
    expect(screen.getAllByRole("option").length).toBeGreaterThan(2);
  });

  it("opens a shop when its result is clicked", () => {
    render(<HeaderSearch />);
    type("ooty");
    fireEvent.click(screen.getByRole("option", { name: /^Ooty Vegetables/ }));
    expect(navigate).toHaveBeenCalledWith({
      to: "/shops/$shopId",
      params: { shopId: "ooty" },
      search: {},
    });
    expect(box()).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens the right shop with the item pre-searched when an item result is clicked", () => {
    render(<HeaderSearch />);
    type("tomato nilam");
    const option = screen.getByRole("option"); // exactly one result
    expect(option).toHaveTextContent("₹40 / kg");
    fireEvent.click(option);
    expect(navigate).toHaveBeenCalledWith({
      to: "/shops/$shopId",
      params: { shopId: "nilam-fresh" },
      search: { q: "Tomatoes" },
    });
  });

  it("works from the keyboard: arrows move, Enter opens", () => {
    render(<HeaderSearch />);
    type("tomato nilam");
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    const option = screen.getByRole("option");
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(box()).toHaveAttribute("aria-activedescendant", option.id);
    fireEvent.submit(box());
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("opens the first result when Enter is pressed without choosing one", () => {
    render(<HeaderSearch />);
    type("ooty");
    fireEvent.submit(box());
    expect(navigate).toHaveBeenCalledWith({
      to: "/shops/$shopId",
      params: { shopId: "ooty" },
      search: {},
    });
  });

  it("wraps around with the arrow keys", () => {
    render(<HeaderSearch />);
    type("tomato nilam"); // one result
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(box(), { key: "ArrowUp" });
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
  });

  it("closes on Escape, then clears on a second Escape", () => {
    render(<HeaderSearch />);
    type("ooty");
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(box()).toHaveValue("ooty");
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(box()).toHaveValue("");
  });

  it("closes when the person clicks elsewhere", () => {
    render(<HeaderSearch />);
    type("ooty");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("says so when nothing matches, and does not navigate on Enter", () => {
    render(<HeaderSearch />);
    type("zzzz");
    expect(screen.getByRole("status")).toHaveTextContent("No shops or items match “zzzz”.");
    fireEvent.submit(box());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("clears with the clear button", () => {
    render(<HeaderSearch />);
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    type("ooty");
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(box()).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows each item's lowest-to-highest price with its shops, cheapest first", () => {
    render(<HeaderSearch />);
    type("tomato");
    // Every sample shop charges the same until shops have their own prices, so a single price is shown.
    expect(screen.getAllByText("₹40 / kg")).toHaveLength(10); // the heading plus nine shops
    expect(screen.getByText(/9 shops, lowest price first/)).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(9);
  });
});
