import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const lookupPincode = vi.fn();
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => ({}),
}));
vi.mock("@/lib/pincode.functions", () => ({
  lookupPincode: (...a: unknown[]) => lookupPincode(...a),
}));

import { NearbyControls } from "@/components/NearbyControls";

const pinBox = () => screen.getByLabelText("PIN code");
const findShops = () => fireEvent.click(screen.getByRole("button", { name: /Find shops/ }));

describe("NearbyControls", () => {
  const onChange = vi.fn();
  beforeEach(() => {
    onChange.mockReset();
    lookupPincode.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("rejects a PIN code that is not six digits", () => {
    render(<NearbyControls origin={null} onChange={onChange} />);
    fireEvent.change(pinBox(), { target: { value: "6000" } });
    findShops();
    expect(screen.getByRole("alert")).toHaveTextContent("6-digit PIN code");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("answers a PIN code our shops use without calling the server", () => {
    render(<NearbyControls origin={null} onChange={onChange} />);
    fireEvent.change(pinBox(), { target: { value: "600095" } });
    findShops();
    expect(lookupPincode).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ label: "PIN 600095" }));
  });

  it("looks up any other PIN code on the server", async () => {
    lookupPincode.mockResolvedValue({ ok: true, point: { lat: 13.0, lng: 80.2 } });
    render(<NearbyControls origin={null} onChange={onChange} />);
    fireEvent.change(pinBox(), { target: { value: "600042" } });
    findShops();
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        point: { lat: 13.0, lng: 80.2 },
        label: "PIN 600042",
      }),
    );
    expect(lookupPincode).toHaveBeenCalledWith({ data: { pincode: "600042" } });
  });

  it("shows the server's message when the PIN code is not found", async () => {
    lookupPincode.mockResolvedValue({ ok: false, error: "We could not find that PIN code." });
    render(<NearbyControls origin={null} onChange={onChange} />);
    fireEvent.change(pinBox(), { target: { value: "999999" } });
    findShops();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not find");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses the device location when allowed", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) =>
          ok({ coords: { latitude: 13.06, longitude: 80.15 } }),
      },
    });
    render(<NearbyControls origin={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Use my location/ }));
    expect(onChange).toHaveBeenCalledWith({
      point: { lat: 13.06, lng: 80.15 },
      label: "your location",
    });
  });

  it("suggests the PIN code when location is blocked", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) =>
          fail({ code: 1, PERMISSION_DENIED: 1 }),
      },
    });
    render(<NearbyControls origin={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Use my location/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("enter your PIN code");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the nearby results", () => {
    render(
      <NearbyControls
        origin={{ point: { lat: 13, lng: 80 }, label: "PIN 600095" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/nearest to PIN 600095/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
