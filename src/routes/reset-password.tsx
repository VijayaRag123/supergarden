import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resetPasswordSchema } from "@/lib/account-validation";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password — Fresh Market" },
    { name: "description", content: "Choose a new password for your Fresh Market account." },
    { property: "og:title", content: "Reset password — Fresh Market" },
    { property: "og:description", content: "Securely reset your Fresh Market account password." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setRecovery(hash.get("type") === "recovery" || sessionStorage.getItem("fresh-market-recovery") === "true");
  }, [user, loading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!recovery || !user || busy) return;
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your passwords."); return; }
    setError(""); setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (updateError) throw updateError;
      sessionStorage.removeItem("fresh-market-recovery");
      toast.success("Your password has been updated.");
      await navigate({ to: "/", replace: true });
    } catch { setError("Could not update your password. Request a new reset link and try again."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-md px-4 py-12"><h1 className="text-3xl font-semibold">Reset your password</h1>{loading ? <Loader2 aria-label="Checking reset link" className="mt-6 h-6 w-6 animate-spin" /> : !recovery || !user ? <div className="mt-6 space-y-4"><p className="text-muted-foreground">This reset link is missing or expired. Request a new link from the login page.</p><Button asChild><Link to="/login">Back to log in</Link></Button></div> : <form onSubmit={submit} noValidate className="mt-6 space-y-4"><div className="space-y-2"><Label htmlFor="new-password">New password</Label><PasswordInput id="new-password" required maxLength={128} autoComplete="new-password" disabled={busy} value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><PasswordInput id="confirm-password" required maxLength={128} autoComplete="new-password" disabled={busy} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="w-full rounded-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save new password</Button></form>}</main>;
}