import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProductCard } from "@/components/ProductCard";
import { getRecommendations } from "@/lib/recommend.functions";
import type { ShopifyProduct } from "@/lib/shopify";

export function ProduceHelper({ products }: { products: ShopifyProduct[] }) {
  const recommend = useServerFn(getRecommendations);
  const [need, setNeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [picks, setPicks] = useState<{ handle: string; reason: string }[]>([]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!need.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await recommend({ data: { need } });
      if (res.ok) {
        setSummary(res.summary);
        setPicks(res.picks);
      } else {
        setError(res.error);
        setPicks([]);
        setSummary(null);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const byHandle = new Map(products.map((p) => [p.node.handle, p]));

  return (
    <section className="mx-auto max-w-6xl px-4 pb-10">
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-2xl font-semibold text-foreground">Not sure what to buy?</h2>
        </div>
        <p className="mt-1 text-muted-foreground">Tell us what you're cooking or need, and our AI helper will pick produce for you.</p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Textarea
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="e.g. Ingredients for a healthy salad, or fruit for my kids' lunchbox"
            className="min-h-12 flex-1"
            maxLength={500}
          />
          <Button type="submit" className="rounded-full sm:self-end" disabled={busy || !need.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 h-4 w-4" /> Suggest</>}
          </Button>
        </form>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {summary && <p className="mt-5 font-medium">{summary}</p>}
        {picks.length > 0 && (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {picks.map((pick) => {
              const product = byHandle.get(pick.handle);
              if (!product) return null;
              return (
                <div key={pick.handle} className="space-y-2">
                  <ProductCard product={product} />
                  <p className="px-1 text-sm text-muted-foreground">{pick.reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
