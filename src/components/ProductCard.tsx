import { Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const p = product.node;
  const variant = p.variants.edges[0]?.node;
  const image = p.images.edges[0]?.node;

  const handleAdd = async () => {
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${p.title} added to basket`);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-transform hover:-translate-y-1">
      <Link to="/product/$handle" params={{ handle: p.handle }} className="aspect-square overflow-hidden bg-muted">
        {image && (
          <img src={image.url} alt={image.altText ?? p.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to="/product/$handle" params={{ handle: p.handle }}>
          <h3 className="text-lg font-semibold">{p.title}</h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode)}
          </span>
          <Button size="sm" className="rounded-full" onClick={handleAdd} disabled={isLoading || !variant?.availableForSale}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Add</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
