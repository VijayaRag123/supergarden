import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") sessionStorage.setItem("fresh-market-recovery", "true");
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "PASSWORD_RECOVERY") return;
      if (active) { setUser(session?.user ?? null); setLoading(false); }
      if (event === "SIGNED_OUT") sessionStorage.removeItem("fresh-market-recovery");
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [router, queryClient]);

  return createElement(AuthContext.Provider, { value: { user, loading } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
