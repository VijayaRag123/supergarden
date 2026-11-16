import { useEffect, useState } from "react";
import { ShoppingBasket, Store, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import {
  findProduct,
  formatQuantity,
  getListing,
  groupMarketLines,
  lineTotal,
  marketTotal,
  rupees,
} from "@/lib/marketplace";
import { MarketQuantity } from "./MarketQuantity";

export function MarketplaceCart() {
  const [open, setOpen] = useState(false);
  const { lines, lastOrder, orderError, placeSampleOrder, dismissOrder, setQuantity } =
    useMarketplaceStore();
  useEffect(() => {
    void useMarketplaceStore.persist.rehydrate();
  }, []);
  // Quantities are in grams / counts now, so the badge counts distinct products instead of adding them up.
  const count = lines.length;
  const groups = groupMarketLines(lines);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="relative gap-2"
          aria-label={`Open cart, ${count} items`}
        >
          <ShoppingBasket />
          <span className="hidden sm:inline">Basket</span>
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground"
            aria-live="polite"
          >
            {count}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="pr-6 text-left">
          <SheetTitle className="font-display text-2xl">Your basket</SheetTitle>
          <SheetDescription>
            {count} items · {groups.length} shops
          </SheetDescription>
        </SheetHeader>

        {lastOrder ? (
          <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto py-6 text-center">
            <CheckCircle2 className="h-14 w-14 shrink-0 text-primary" />
            <h2 className="text-2xl">Sample order saved</h2>
            <p className="font-bold">{lastOrder.id}</p>
            <ul className="w-full space-y-1 text-left text-sm">
              {lastOrder.lines.map((l) => (
                <li key={`${l.shopId}-${l.productId}`} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {l.productName} · {formatQuantity(l.quantity, l.unit)}{" "}
                    <span className="text-xs text-muted-foreground">
                      @ {rupees(l.unitPrice)} / {l.unit}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.shopName}
                    </span>
                  </span>
                  <span className="font-bold">{rupees(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="text-lg font-bold">Total {rupees(lastOrder.total)}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              This is a local sample order. No payment was taken and no order was sent to the shops.
            </p>
            <Button
              onClick={() => {
                dismissOrder();
                setOpen(false);
              }}
            >
              Continue shopping
              <ArrowRight />
            </Button>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingBasket className="h-14 w-14 text-primary" />
            <h2 className="text-2xl">A little freshness awaits</h2>
            <p className="text-muted-foreground">Your basket is empty.</p>
            <Button onClick={() => setOpen(false)}>
              Browse shops
              <ArrowRight />
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto py-5">
              {groups.map(({ shop, lines: group }) => (
                <section key={shop.id} className="mb-6">
                  <h3 className="flex items-start gap-2 border-b pb-3 font-sans text-sm font-bold">
                    <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {shop.name}
                  </h3>
                  {group.map((line) => {
                    const p = findProduct(line.productId);
                    const listing = getListing(shop.id, line.productId);
                    if (!p || !listing) return null;
                    const priceChanged =
                      line.priceAtAdd !== undefined && line.priceAtAdd !== listing.price;
                    return (
                      <div key={p.id} className="flex gap-3 border-b py-4">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-16 w-16 shrink-0 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{p.name}</p>
                          <p className="mb-2 text-xs text-muted-foreground">
                            {rupees(listing.price)} / {p.unit}
                          </p>
                          {priceChanged && (
                            <p className="mb-2 text-xs font-semibold text-destructive">
                              Price updated (was {rupees(line.priceAtAdd ?? listing.price)})
                            </p>
                          )}
                          <div className="max-w-40">
                            <MarketQuantity shopId={shop.id} productId={p.id} name={p.name} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <span className="font-bold">
                            {rupees(lineTotal(listing.price, line.quantity, p.unit))}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${p.name} from ${shop.name}`}
                            onClick={() => setQuantity(shop.id, p.id, 0)}
                          >
                            <Trash2 className="text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-3 text-sm">
                    <span>Shop subtotal</span>
                    <span className="font-bold">{rupees(marketTotal(group))}</span>
                  </div>
                </section>
              ))}
            </div>
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Subtotal</span>
                <span>{rupees(marketTotal(lines))}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sample prices. Place Order saves a sample locally only; it does not contact shops or
                take payment.
              </p>
              {orderError && (
                <p className="text-sm text-destructive" role="alert">
                  {orderError}
                </p>
              )}
              <Button className="w-full" size="lg" onClick={placeSampleOrder}>
                Place Order
                <ArrowRight />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
