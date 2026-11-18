import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanPincode, isValidPincode, localPincodePoint } from "@/lib/nearby-shops";
import { lookupPincode } from "@/lib/pincode.functions";
import type { GeoPoint } from "@/lib/shop-locations";

export interface Origin {
  point: GeoPoint;
  /** What to call the starting point: "your location" or "PIN 600095". */
  label: string;
}

/** Lets a customer find nearby shops from their device's location or from a PIN code. */
export function NearbyControls({
  origin,
  onChange,
}: {
  origin: Origin | null;
  onChange: (origin: Origin | null) => void;
}) {
  const lookup = useServerFn(lookupPincode);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<"location" | "pin" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const useMyLocation = () => {
    if (busy) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser can't share its location. Please enter your PIN code instead.");
      return;
    }
    setBusy("location");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        setPin("");
        onChange({
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          label: "your location",
        });
      },
      (err) => {
        setBusy(null);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Allow it in your browser, or enter your PIN code."
            : "We couldn't get your location. Please enter your PIN code instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const findByPin = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const code = cleanPincode(pin);
    if (!isValidPincode(code)) {
      setError("Enter a 6-digit PIN code, for example 600095.");
      return;
    }
    setError(null);
    // Our own shops' PIN codes are answered here, with no network call.
    const local = localPincodePoint(code);
    if (local) {
      onChange({ point: local, label: `PIN ${code}` });
      return;
    }
    setBusy("pin");
    try {
      const res = await lookup({ data: { pincode: code } });
      if (res.ok) onChange({ point: res.point, label: `PIN ${code}` });
      else setError(res.error);
    } catch {
      setError("Could not look up that PIN code right now.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">Find shops near you</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Button
          type="button"
          variant="secondary"
          onClick={useMyLocation}
          disabled={busy !== null}
          className="sm:shrink-0"
        >
          {busy === "location" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair aria-hidden="true" />
          )}
          Use my location
        </Button>
        <span className="hidden self-center text-xs text-muted-foreground sm:inline">or</span>
        <form onSubmit={findByPin} className="flex flex-1 gap-2">
          <input
            aria-label="PIN code"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={7}
            placeholder="Enter PIN code, e.g. 600095"
            value={pin}
            onChange={(e) => setPin(cleanPincode(e.target.value))}
            className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={busy !== null}>
            {busy === "pin" && <Loader2 className="animate-spin" aria-hidden="true" />}
            Find shops
          </Button>
        </form>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {origin && !error && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Showing shops nearest to {origin.label}.</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium text-primary underline"
            onClick={() => {
              onChange(null);
              setPin("");
              setError(null);
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </p>
      )}
    </div>
  );
}
