import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Store, X } from "lucide-react";
import { rupees } from "@/lib/marketplace";
import { searchMarketplace } from "@/lib/marketplace-search";

type Option =
  | { kind: "shop"; key: string; shopId: string; title: string; subtitle: string }
  | {
      kind: "product";
      key: string;
      shopId: string;
      productName: string;
      title: string;
      subtitle: string;
      image: string;
      price: string;
      inStock: boolean;
    };

/** Search box for the site header. Finds shops by name or area, and produce by name at each shop that sells it. */
export function HeaderSearch() {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(() => searchMarketplace(query), [query]);
  const options: Option[] = useMemo(
    () => [
      ...results.shops.map(({ shop }): Option => ({
        kind: "shop",
        key: `shop-${shop.id}`,
        shopId: shop.id,
        title: shop.name,
        subtitle: shop.area,
      })),
      ...results.products.map(({ product, shop, listing }): Option => ({
        kind: "product",
        key: `product-${product.id}-${shop.id}`,
        shopId: shop.id,
        productName: product.name,
        title: product.name,
        subtitle: `${shop.name} · ${shop.area}`,
        image: product.image,
        price: `${rupees(listing.price)} / ${product.unit}`,
        inStock: listing.inStock,
      })),
    ],
    [results],
  );

  const hasQuery = query.trim().length > 0;
  const showPanel = open && hasQuery;
  const optionId = (index: number) => `${listId}-option-${index}`;

  // Close the list when the person clicks or taps anywhere else.
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  // Keep the highlighted option visible when moving with the arrow keys.
  useEffect(() => {
    if (active >= 0)
      document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const choose = (option: Option) => {
    // Product results open that shop with the shop page's own search already filled in.
    void navigate({
      to: "/shops/$shopId",
      params: { shopId: option.shopId },
      search: option.kind === "product" ? { q: option.productName } : {},
    });
    setQuery("");
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const option = options[active] ?? options[0];
    if (option) choose(option);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!options.length) return;
      event.preventDefault();
      setOpen(true);
      const last = options.length - 1;
      setActive((i) =>
        event.key === "ArrowDown" ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1,
      );
    } else if (event.key === "Escape") {
      if (showPanel) setOpen(false);
      else setQuery("");
      setActive(-1);
    }
  };

  const shopCount = results.shops.length;
  return (
    <div ref={rootRef} className="relative w-full">
      <form role="search" onSubmit={onSubmit}>
        <Search
          className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search shops and items"
          aria-expanded={showPanel && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={60}
          value={query}
          placeholder="Search shops or items"
          className="h-10 w-full rounded-full border bg-background pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {hasQuery && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => {
              setQuery("");
              setActive(-1);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
          {options.length === 0 ? (
            <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">
              No shops or items match “{query.trim()}”.
            </p>
          ) : (
            <ul
              id={listId}
              role="listbox"
              aria-label="Search results"
              onMouseDown={(event) => event.preventDefault()}
            >
              {options.map((option, index) => (
                <li key={option.key} role="presentation">
                  {index === 0 && shopCount > 0 && <Heading>Shops</Heading>}
                  {index === shopCount && option.kind === "product" && <Heading>Items</Heading>}
                  <div
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 ${index === active ? "bg-secondary" : "hover:bg-secondary/60"}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                  >
                    {option.kind === "shop" ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                        <Store className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : (
                      <img
                        src={option.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{option.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.subtitle}
                      </span>
                    </span>
                    {option.kind === "product" &&
                      (option.inStock ? (
                        <span className="shrink-0 text-sm font-bold text-primary">
                          {option.price}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold text-destructive">
                          Out of stock
                        </span>
                      ))}
                  </div>
                </li>
              ))}
              {results.moreProducts > 0 && (
                <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">
                  {results.moreProducts} more matches. Add a shop name to narrow it down.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <p
      role="presentation"
      className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
    >
      {children}
    </p>
  );
}
