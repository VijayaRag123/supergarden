import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarketplaceStore } from "@/stores/marketplaceStore";

export function MarketQuantity({ shopId, productId, name }: { shopId: string; productId: string; name: string }) {
  const quantity = useMarketplaceStore(s => s.lines.find(l => l.shopId === shopId && l.productId === productId)?.quantity ?? 0);
  const setQuantity = useMarketplaceStore(s => s.setQuantity);
  return <div className="h-9 w-full">{quantity === 0 ? <Button className="w-full" variant="outline" onClick={() => setQuantity(shopId, productId, 1)} aria-label={`Add ${name} to cart`}><ShoppingBasket />Add to Cart</Button> : <div className="flex h-9 items-center justify-between rounded-md border border-primary bg-secondary text-primary"><Button variant="ghost" size="icon" aria-label={`Decrease ${name}`} onClick={() => setQuantity(shopId, productId, quantity - 1)}><Minus /></Button><span className="text-sm font-bold" aria-live="polite">{quantity}</span><Button variant="ghost" size="icon" aria-label={`Increase ${name}`} onClick={() => setQuantity(shopId, productId, quantity + 1)}><Plus /></Button></div>}</div>;
}