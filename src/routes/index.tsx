import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Truck, Sprout } from "lucide-react";
import heroImage from "@/assets/hero-produce.jpg";
import { ProductCard } from "@/components/ProductCard";
import { ProduceHelper } from "@/components/ProduceHelper";
import { fetchProducts } from "@/lib/shopify";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fresh Market — Fruits & Vegetables Delivered" },
      { name: "description", content: "Shop farm-fresh fruits and vegetables online, delivered to your door." },
      { property: "og:title", content: "Fresh Market — Fruits & Vegetables Delivered" },
      { property: "og:description", content: "Shop farm-fresh fruits and vegetables online, delivered to your door." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products, isLoading, error } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts(50) });

  return (
    <main>
      <section className="relative overflow-hidden">
        <img src={heroImage} alt="Fresh fruits and vegetables on a market table" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-hero-foreground md:py-32">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Picked this morning</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-6xl">Fresh fruits & vegetables, straight to your door.</h1>
          <p className="mt-4 max-w-md text-lg opacity-90">Seasonal produce from local farms — crisp, colourful and full of flavour.</p>
          <a href="#shop" className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform hover:scale-105">
            Shop now
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <Sprout className="h-6 w-6" /> Farm-fresh, hand-picked quality
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <Truck className="h-6 w-6" /> Quick doorstep delivery
        </div>
      </section>

      <ProduceHelper products={products ?? []} />

      <section id="shop" className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-3xl font-semibold">Shop fresh produce</h2>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="py-20 text-center text-muted-foreground">Couldn't load products right now. Please try again.</p>
        ) : !products || products.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <p className="text-lg font-semibold">No products found</p>
            <p className="mt-1 text-muted-foreground">Products will appear here once they're added to the store.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.node.id} product={p} />)}
          </div>
        )}
      </section>
    </main>
  );
}
