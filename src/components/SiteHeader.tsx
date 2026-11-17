import { Link, useNavigate } from "@tanstack/react-router";
import { Leaf, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceCart } from "@/components/MarketplaceCart";
import { HeaderSearch } from "@/components/HeaderSearch";
import { MealPlanner } from "@/components/MealPlanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not log out. Please try again.");
      return;
    }
    navigate({ to: "/login", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      {/* Phone and tablet: logo and buttons on the first row, search on a full-width second row.
          lg and up: logo on the left, search in the centre, buttons on the right. */}
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_minmax(0,26rem)_1fr]">
        <Link to="/" className="flex items-center gap-2 lg:col-start-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-semibold sm:text-xl">Fresh Market</span>
        </Link>
        <div className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <HeaderSearch />
        </div>
        <nav className="flex items-center justify-self-end gap-2 lg:col-start-3">
          {!loading && user ? (
            <>
              <span className="hidden max-w-32 truncate text-sm text-muted-foreground xl:inline">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="mr-1 h-4 w-4" /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
          <MealPlanner iconOnly />
          <MarketplaceCart />
        </nav>
      </div>
    </header>
  );
}
