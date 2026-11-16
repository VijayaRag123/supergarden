import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import {
  findProduct,
  formatQuantity,
  getListing,
  maxQuantity,
  quantityStep,
  quickQuantities,
} from "@/lib/marketplace";

export function MarketQuantity({
  shopId,
  productId,
  name,
}: {
  shopId: string;
  productId: string;
  name: string;
}) {
  const quantity = useMarketplaceStore(
    (s) => s.lines.find((l) => l.shopId === shopId && l.productId === productId)?.quantity ?? 0,
  );
  const setQuantity = useMarketplaceStore((s) => s.setQuantity);
  const product = findProduct(productId);
  const listing = getListing(shopId, productId);
  if (!product || !listing || !listing.listed) return null;

  const unit = product.unit;
  const step = quantityStep(unit);
  const max = maxQuantity(listing, unit);
  if (max === 0 && quantity === 0)
    return (
      <Button className="w-full" variant="outline" disabled>
        Out of stock
      </Button>
    );

  const atLimit = quantity + step > max;
  const quick = quickQuantities(unit).filter((q) => q <= max);
  return (
    <div className="flex w-full flex-col gap-2">
      {quantity === 0 ? (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setQuantity(shopId, productId, step)}
          aria-label={`Add ${name} to cart`}
        >
          <ShoppingBasket />
          Add to Cart
        </Button>
      ) : (
        <div className="flex h-9 items-center justify-between rounded-md border border-primary bg-secondary text-primary">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Decrease ${name}`}
            onClick={() => setQuantity(shopId, productId, quantity - step)}
          >
            <Minus />
          </Button>
          <span className="text-sm font-bold" aria-live="polite">
            {formatQuantity(quantity, unit)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Increase ${name}`}
            disabled={atLimit}
            onClick={() => setQuantity(shopId, productId, quantity + step)}
          >
            <Plus />
          </Button>
        </div>
      )}
      {quick.length > 0 && (
        <div className="flex gap-1" role="group" aria-label={`Quick amounts for ${name}`}>
          {quick.map((q) => (
            <Button
              key={q}
              type="button"
              size="sm"
              className="h-7 flex-1 px-1 text-xs"
              variant={quantity === q ? "default" : "outline"}
              aria-pressed={quantity === q}
              aria-label={`Set ${name} to ${formatQuantity(q, unit)}`}
              onClick={() => setQuantity(shopId, productId, q)}
            >
              {formatQuantity(q, unit)}
            </Button>
          ))}
        </div>
      )}
      {quantity > 0 && atLimit && Number.isFinite(max) && (
        <p className="text-xs text-muted-foreground">Only {formatQuantity(max, unit)} available</p>
      )}
    </div>
  );
}
