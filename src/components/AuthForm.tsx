import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/PasswordInput";
import { emailSchema, loginSchema, signupSchema } from "@/lib/account-validation";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const GoogleLogo = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.480-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.960 6.73-4.96z"/></svg>
);

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const [values, setValues] = useState({ email: "", password: "", first_name: "", surname: "", mobile_number: "", home_address: "", gender: "" });
  const [birth, setBirth] = useState({ day: "", month: "", year: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const update = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; delete next['form']; return next; });
  };
  const fieldError = (key: string) => errors[key] ? <p id={`${key}-error`} className="text-sm text-destructive" role="alert">{errors[key]}</p> : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setErrors({});
    if (forgot) {
      const parsed = emailSchema.safeParse(values.email);
      if (!parsed.success) { setErrors({ email: parsed.error.issues[0]?.message ?? "Check your details." }); return; }
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setResetSent(true);
      } catch { setErrors({ form: "Could not send the reset email. Please try again shortly." }); }
      finally { setBusy(false); }
      return;
    }
    const birthday = Object.values(birth).some(Boolean) ? `${birth.year}-${birth.month}-${birth.day}` : "";
    const parsed = (isLogin ? loginSchema : signupSchema).safeParse({ ...values, date_of_birth: birthday });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next); return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
        toast.success("Welcome back!");
        await navigate({ to: "/" });
      } else {
        const profile = signupSchema.parse({ ...values, date_of_birth: birthday });
        const { email, password, ...details } = profile;
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: details } });
        if (error) throw error;
        if (data.session) await navigate({ to: "/" });
        else setSent(true);
      }
    } catch {
      setErrors({ form: isLogin ? "Could not log in. Check your email and password, and confirm your email first." : "Could not create your account. Please check your details or try logging in." });
    } finally { setBusy(false); }
  }

  async function google() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error("Sign-in incomplete");
      await navigate({ to: "/" });
    } catch { setErrors({ form: "Google sign-in failed. Please try again." }); }
    finally { setBusy(false); }
  }

  if (sent || resetSent) return <div className="space-y-4 text-center"><h1 className="text-3xl font-semibold">Check your email</h1><p className="break-words text-muted-foreground">{sent ? `We sent a confirmation link to ${values.email}. Confirm your email to finish signing up.` : "If an account exists for this email, you’ll receive a password reset link."}</p><Button asChild variant="outline"><Link to="/login">Back to log in</Link></Button></div>;

  return (
    <div>
      <h1 className="text-3xl font-semibold">{forgot ? "Forgot password?" : isLogin ? "Log in" : "Create an account"}</h1>
      <p className="mt-2 text-muted-foreground">{forgot ? "Enter your email address to reset your password." : isLogin ? "Welcome back to Fresh Market." : "Fresh produce, delivered to your doorstep."}</p>
      {!forgot && <><Button type="button" variant="outline" className="mt-6 w-full gap-2" disabled={busy} onClick={google}><GoogleLogo /> Continue with Google</Button><div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" /></div></>}
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        {!isLogin && <>
          <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-semibold">Name</legend><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([['first_name','First name'],['surname','Surname']] as const).map(([key,label]) => <div key={key} className="space-y-1.5"><Label htmlFor={key}>{label}</Label><Input id={key} autoComplete={key === 'first_name' ? 'given-name' : 'family-name'} maxLength={100} required value={values[key]} onChange={(e) => update(key,e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined}/>{fieldError(key)}</div>)}</div></fieldset>
          <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-semibold">Date of birth <span className="font-normal text-muted-foreground">(optional)</span></legend><div className="grid grid-cols-3 gap-2">{(['day','month','year'] as const).map((key) => <Select key={key} value={birth[key]} onValueChange={(value) => setBirth((old) => ({ ...old, [key]: value }))}><SelectTrigger className="w-full" aria-label={key}><SelectValue placeholder={key.charAt(0).toUpperCase()+key.slice(1)} /></SelectTrigger><SelectContent>{Array.from({ length: key === 'day' ? 31 : key === 'month' ? 12 : new Date().getFullYear() - 1899 }, (_, i) => key === 'year' ? String(new Date().getFullYear()-i) : String(i+1).padStart(2,'0')).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>)}</div>{fieldError('date_of_birth')}</fieldset>
          <div className="space-y-1.5"><Label htmlFor="gender">Gender <span className="text-muted-foreground">(optional)</span></Label><Select disabled={busy} value={values.gender} onValueChange={(value) => update('gender',value)}><SelectTrigger id="gender" className="w-full"><SelectValue placeholder="Select your gender" /></SelectTrigger><SelectContent><SelectItem value="female">Female</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="other">Other</SelectItem><SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="mobile_number">Mobile number</Label><Input id="mobile_number" type="tel" autoComplete="tel" placeholder="+919876543210" maxLength={16} required disabled={busy} value={values.mobile_number} onChange={(e) => update('mobile_number',e.target.value)} aria-invalid={!!errors["mobile_number"]} aria-describedby="mobile_number-error" />{fieldError('mobile_number')}</div>
          <div className="space-y-1.5"><Label htmlFor="home_address">Home address</Label><Textarea id="home_address" autoComplete="street-address" rows={3} maxLength={500} required disabled={busy} value={values.home_address} onChange={(e) => update('home_address',e.target.value)} aria-invalid={!!errors["home_address"]} aria-describedby="home_address-error" />{fieldError('home_address')}</div>
        </>}
        <div className="space-y-1.5"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" maxLength={255} required disabled={busy} value={values.email} onChange={(e) => update('email',e.target.value)} aria-invalid={!!errors["email"]} aria-describedby="email-error" />{fieldError('email')}</div>
        {!forgot && <div className="space-y-1.5"><div className="flex items-center justify-between gap-2"><Label htmlFor="password">Password</Label>{isLogin && <Button type="button" variant="link" className="h-auto px-0 text-sm" disabled={busy} onClick={() => { setForgot(true); setErrors({}); }}>Forgot password?</Button>}</div><PasswordInput id="password" autoComplete={isLogin ? "current-password" : "new-password"} maxLength={128} required disabled={busy} value={values.password} onChange={(e) => update('password',e.target.value)} aria-invalid={!!errors["password"]} aria-describedby="password-error" />{!isLogin && <p className="text-xs text-muted-foreground">At least 6 characters</p>}{fieldError('password')}</div>}
        {errors["form"] && <p className="text-sm text-destructive" role="alert">{errors["form"]}</p>}
        <Button type="submit" className="w-full rounded-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{busy ? "Please wait…" : forgot ? "Send reset link" : isLogin ? "Log in" : "Create account"}</Button>
      </form>
      {forgot ? <Button variant="ghost" className="mt-4 w-full" onClick={() => { setForgot(false); setErrors({}); }}>Back to log in</Button> : <div className="mt-5 text-center">{isLogin ? <p className="text-sm text-muted-foreground">New customer? <Link to="/signup" className="font-semibold text-primary hover:underline">Create an account</Link></p> : <Button asChild variant="secondary" className="w-full rounded-full"><Link to="/login">I already have an account</Link></Button>}</div>}
    </div>
  );
}
