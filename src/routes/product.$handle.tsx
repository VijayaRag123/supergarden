import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchProductByHandle, formatPrice } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/product/$handle")({
  head: () => ({
    meta: [
      { title: "Product — Fresh Market" },
      { name: "description", content: "Fresh produce from Fresh Market." },
      { property: "og:title", content: "Product — Fresh Market" },
      { property: "og:description", content: "Fresh produce from Fresh Market." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { handle } = Route.useParams();
  const { data: product, isLoading } = useQuery({ queryKey: ["product", handle], queryFn: () => fetchProductByHandle(handle) });
  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.isLoading);
  const [variantIdx, setVariantIdx] = useState(0);

  if (isLoading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) return <div className="py-32 text-center text-muted-foreground">Product not found.</div>;

  const p = product.node;
  const variants = p.variants.edges.map((e) => e.node);
  const variant = variants[variantIdx];
  const image = p.images.edges[0]?.node;

  const handleAdd = async () => {
    if (!variant) return;
    await addItem({ product, variantId: variant.id, variantTitle: variant.title, price: variant.price, quantity: 1, selectedOptions: variant.selectedOptions });
    toast.success(`${p.title} added to basket`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
          {image && <img src={image.url} alt={image.altText ?? p.title} className="h-full w-full object-cover" />}
        </div>
        <div>
          <h1 className="text-4xl font-semibold">{p.title}</h1>
          {variant && <p className="mt-3 text-2xl font-bold text-primary">{formatPrice(variant.price.amount, variant.price.currencyCode)}</p>}
          <p className="mt-6 leading-relaxed text-muted-foreground">{p.description}</p>
          {variants.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {variants.map((v, i) => (
                <Button key={v.id} variant={i === variantIdx ? "default" : "outline"} size="sm" onClick={() => setVariantIdx(i)}>
                  {v.title}
                </Button>
              ))}
            </div>
          )}
          <Button size="lg" className="mt-8 rounded-full" onClick={handleAdd} disabled={cartLoading || !variant?.availableForSale}>
            {cartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to basket"}
          </Button>
        </div>
      </div>
    </main>
  );
}
