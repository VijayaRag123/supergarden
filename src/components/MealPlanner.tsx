import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChefHat, Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { getMealPlan } from "@/lib/meal-plan.functions";
import { MAX_REQUEST_CHARS, addPlanToBasket, resolvePlan, type MealPlan } from "@/lib/meal-plan";
import { findProduct, formatQuantity, rupees } from "@/lib/marketplace";
import { useMarketplaceStore } from "@/stores/marketplaceStore";

const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "ta-IN", label: "தமிழ்" },
];

export function MealPlanner({ iconOnly = false }: { iconOnly?: boolean }) {
  const { user } = useAuth();
  const ask = useServerFn(getMealPlan);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [added, setAdded] = useState(false);

  const onSpeech = useCallback(
    (spoken: string) => setText((t) => `${t} ${spoken}`.trim().slice(0, MAX_REQUEST_CHARS)),
    [],
  );
  const voice = useSpeechInput(lang, onSpeech);
  // Bumped on every close, so an answer that arrives after closing is thrown away.
  const session = useRef(0);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    // Closing clears everything, so reopening starts fresh.
    session.current += 1;
    voice.stop();
    setText("");
    setPlan(null);
    setError(null);
    setAdded(false);
    setBusy(false);
  };
  const resolved = useMemo(() => (plan ? resolvePlan(plan) : null), [plan]);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setPlan(null);
    setAdded(false);
    const mine = session.current;
    try {
      const res = await ask({ data: { request: text } });
      if (mine !== session.current) return;
      if (res.ok) setPlan(res.plan);
      else setError(res.error);
    } catch {
      if (mine === session.current) setError("Something went wrong. Please try again.");
    } finally {
      if (mine === session.current) setBusy(false);
    }
  };

  const addToBasket = () => {
    if (!resolved?.lines.length) return;
    // Uses the same basket as the rest of the app, so quantity limits and stock checks still apply.
    useMarketplaceStore.setState((state) => ({
      lines: addPlanToBasket(state.lines, resolved.lines),
      lastOrder: null,
      orderError: null,
    }));
    setAdded(true);
  };

  const total = resolved
    ? resolved.lines.reduce((sum, l) => sum + Math.round(l.total * 100), 0) / 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Plan my week: meal ideas and voice ordering"
            title="Plan my week (meal ideas & voice order)"
          >
            <ChefHat className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="secondary" className="rounded-full">
            <Sparkles className="mr-1 h-4 w-4" /> Plan my week
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>What shall we cook?</DialogTitle>
          <DialogDescription>
            Ask for meal ideas or say what you want to buy. We'll suggest a basket for you to check
            before adding.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <p className="text-sm">
            Please{" "}
            <Link
              to="/login"
              className="font-medium underline"
              onClick={() => handleOpenChange(false)}
            >
              log in
            </Link>{" "}
            to use the meal planner.
          </p>
        ) : (
          <div className="space-y-3">
            <Textarea
              aria-label="Your request"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_REQUEST_CHARS}
              placeholder="e.g. What can I cook this week for 3 people? Or: 2 kilos tomatoes and a bunch of spinach"
              className="min-h-24"
            />
            <div className="flex flex-wrap items-center gap-2">
              {voice.supported && (
                <>
                  <select
                    aria-label="Voice language"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant={voice.listening ? "destructive" : "outline"}
                    onClick={voice.listening ? voice.stop : voice.start}
                  >
                    {voice.listening ? (
                      <>
                        <MicOff className="mr-1 h-4 w-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Mic className="mr-1 h-4 w-4" /> Speak
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                type="button"
                className="ml-auto rounded-full"
                onClick={submit}
                disabled={busy || !text.trim()}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" /> Suggest basket
                  </>
                )}
              </Button>
            </div>
            {voice.listening && (
              <p className="text-sm text-muted-foreground" role="status">
                Listening…
              </p>
            )}
            {voice.error && <p className="text-sm text-destructive">{voice.error}</p>}
            {!voice.supported && (
              <p className="text-xs text-muted-foreground">
                Voice input isn't available in this browser. You can type instead.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        {plan && resolved && (
          <div className="space-y-3 border-t pt-4">
            <p className="font-medium">{plan.summary}</p>
            {plan.dishes.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Dishes: {plan.dishes.map((d) => d.name).join(", ")}
              </p>
            )}
            <ul className="divide-y rounded-md border">
              {resolved.lines.map((l) => {
                const product = findProduct(l.productId);
                return (
                  <li
                    key={l.productId}
                    className="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{l.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.shopName} · for {l.dishes.join(", ")}
                        {l.reducedForStock && " · reduced to what the shop has"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{product ? formatQuantity(l.quantity, product.unit) : l.quantity}</p>
                      <p className="text-xs text-muted-foreground">{rupees(l.total)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {(plan.unavailable.length > 0 || resolved.skipped.length > 0) && (
              <p className="text-sm text-muted-foreground">
                Not available: {[...plan.unavailable, ...resolved.skipped].join(", ")}.
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Estimated total <span className="font-semibold">{rupees(total)}</span>
              </p>
              <Button onClick={addToBasket} disabled={added || resolved.lines.length === 0}>
                {added ? "Added to basket" : "Add to basket"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Suggestions come from AI and may not be perfect. Nothing is ordered until you check
              your basket yourself.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
