import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MapPin, Search, Star, Store, Leaf, Clock3 } from "lucide-react";
import heroImage from "@/assets/hero-produce.jpg";
import { Button } from "@/components/ui/button";
import { shops, sampleProducts } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fresh Market — Chennai’s Local Fruit & Vegetable Shops" },
      { name: "description", content: "Explore nine neighbourhood fruit and vegetable shops around Chennai, with shop details and sample produce catalogs." },
      { property: "og:title", content: "Fresh Market — Chennai’s Local Fruit & Vegetable Shops" },
      { property: "og:description", content: "Discover nine local produce shops in Ayanambakkam, Vanagaram, Ambattur and Mogappair." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [search, setSearch] = useState("");
  const filtered = shops.filter(s => `${s.name} ${s.area}`.toLowerCase().includes(search.toLowerCase()));
  return <main><section className="relative overflow-hidden"><img src={heroImage} alt="Fresh market vegetables and fruits" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-hero-overlay" /><div className="relative mx-auto max-w-6xl px-4 py-12 text-hero-foreground sm:px-6 sm:py-16"><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Leaf className="h-4 w-4" />Local shops. Fresh beginnings.</p><h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">Your neighbourhood<br />fruit & vegetable market.</h1><p className="mt-4 max-w-md text-base opacity-90">A little closer to the farm. A little closer to home.<br />Discover fresh picks from Chennai’s local shops.</p><div className="mt-6 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-accent" />Chennai, Tamil Nadu<span className="mx-2 opacity-50">|</span>9 local shops</div></div></section>
  <section className="mx-auto max-w-6xl px-4 py-9 sm:px-6"><div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Fresh finds, close to you</p><h2 className="text-3xl font-semibold">Explore your local shops</h2><p className="mt-2 text-sm text-muted-foreground">Ayanambakkam · Vanagaram · Ambattur · Mogappair</p></div><label className="relative w-full sm:w-80"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search shops or locality" placeholder="Search shops or locality" value={search} onChange={e => setSearch(e.target.value)} className="h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></div><div className="mb-4 flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} neighbourhood shops</span><span>Shop details from your directory</span></div>
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(shop => { const index = shops.indexOf(shop); const image = sampleProducts[[0,4,7,3,6,9,5,1,8][index] ?? 0]; return <article key={shop.id} className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow motion-safe:hover:shadow-soft"><div className="relative h-32 overflow-hidden bg-secondary"><img src={image?.image} alt={`Fresh ${image?.name.toLowerCase()} produce`} loading="lazy" width={500} height={250} className="h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105" /><span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-card/95 px-2.5 py-1 text-xs font-bold text-primary"><Store className="h-3.5 w-3.5" />Local produce shop</span>{shop.rating && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-card/95 px-2 py-1 text-xs font-bold"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{shop.rating.replace('/5','')}</span>}</div><div className="flex flex-1 flex-col p-5"><h3 className="min-h-14 text-xl font-semibold leading-snug">{shop.name}</h3><p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{shop.area}</p><p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5 shrink-0" />{shop.hours}</p><div className="mt-auto pt-5"><Button asChild className="w-full justify-between"><Link to="/shops/$shopId" params={{shopId: shop.id}}>Shop Me<ArrowRight /></Link></Button></div></div></article>; })}</div>{filtered.length === 0 && <p className="py-14 text-center text-muted-foreground">No shops match your search.</p>}</section><footer className="border-t bg-secondary"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-6"><span className="flex items-center gap-2 font-display text-lg font-semibold"><Leaf className="h-5 w-5 text-primary" />Fresh Market</span><span className="text-xs text-muted-foreground">Chennai’s neighbourhood fruit & vegetable directory</span></div></footer></main>;
}
