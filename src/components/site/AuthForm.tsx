import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { otherRole, roleMeta, signInSchema, signUpSchema, type AppRole } from "@/lib/account";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary";

export const OAUTH_ROLE_KEY = "pupuk:oauth-role";

type Stage = "form" | "check-email" | "add-role";

export function AuthForm({ role, initialMode = "signin" }: { role: AppRole; initialMode?: "signin" | "signup" }) {
  const meta = roleMeta[role];
  const other = roleMeta[otherRole(role)];
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "lovable" | "add-role" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function goToRoleArea(userId: string) {
    const roles = await getMyRoles(userId);
    if (roles.includes(role)) {
      navigate({ to: meta.area });
    } else if (roles.length === 0) {
      // They picked this role when signing up (e.g. before confirming email) — no need to ask again.
      await ensureRoleProfile(userId, role);
      navigate({ to: meta.area });
    } else {
      setStage("add-role");
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = mode === "signup" ? signUpSchema.safeParse({ name, email, password }) : signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setBusy("email");
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim(), signup_role: role }, emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (!data.session) {
          setStage("check-email");
          return;
        }
        if (data.user) await ensureRoleProfile(data.user.id, role);
        navigate({ to: meta.area });
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        if (data.user) await goToRoleArea(data.user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleOAuth(provider: "google" | "lovable") {
    setError(null);
    setBusy(provider);
    try {
      sessionStorage.setItem(OAUTH_ROLE_KEY, role);
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // browser is navigating away
    } catch (err) {
      sessionStorage.removeItem(OAUTH_ROLE_KEY);
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setBusy(null);
    }
  }

  async function handleAddRole() {
    setBusy("add-role");
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Your session expired. Please sign in again.");
      await ensureRoleProfile(data.user.id, role);
      toast.success(`${meta.label} profile added to your account.`);
      navigate({ to: meta.area });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the role. Please try again.");
      setBusy(null);
    }
  }

  if (stage === "check-email") {
    return (
      <div className="card-soft w-full max-w-md p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-mint text-primary">
          <MailCheck className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Check your email</h1>
        <p className="mt-3 text-muted-foreground">
          We sent a confirmation link to <strong>{email.trim()}</strong>. Click it, then come back and sign in as a{" "}
          {meta.label.toLowerCase()}.
        </p>
        <Button variant="pill" className="mt-6" onClick={() => { setStage("form"); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  if (stage === "add-role") {
    const question =
      role === "student"
        ? "This email is currently registered as a Teacher. Would you like to continue and add a Student profile to your account?"
        : "This email is currently registered as a Student. Would you like to create a Tutor profile with this account?";
    return (
      <div className="card-soft w-full max-w-md p-8 text-center" role="alertdialog" aria-labelledby="xrole-h" aria-describedby="xrole-d">
        <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${other.tone} text-primary`}>
          <other.icon className="size-7" />
        </span>
        <h1 id="xrole-h" className="mt-5 text-2xl font-extrabold">You already have a {other.label.toLowerCase()} account</h1>
        <p id="xrole-d" className="mt-3 text-muted-foreground">{question}</p>
        {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">{error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="pill" size="lg" onClick={handleAddRole} disabled={busy !== null}>
            {busy === "add-role" && <Loader2 className="animate-spin" />}
            Continue as {meta.label}
          </Button>
          <Button variant="pill-outline" size="lg" onClick={() => navigate({ to: other.area })} disabled={busy !== null}>
            {role === "student" ? "Go to Teacher Dashboard instead" : "Go to Student Portal instead"}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => supabase.auth.signOut().then(() => setStage("form"))}>
            Sign out &amp; use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft w-full max-w-md p-8">
      <span className={`grid size-14 place-items-center rounded-2xl ${meta.tone} text-primary`}>
        <meta.icon className="size-7" />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold">
        {mode === "signin" ? `${meta.label} sign in` : `Create your ${meta.label.toLowerCase()} account`}
      </h1>
      <p className="mt-2 text-muted-foreground">{meta.blurb}</p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className={`rounded-lg px-2 py-2 text-sm font-bold ${mode === m ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleEmail} className="mt-5 space-y-4" noValidate>
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Your name</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="e.g. Aina Rahman" />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</span>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Password</span>
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          />
        </label>
        {error && <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive" role="alert">{error}</p>}
        <Button type="submit" variant="pill" size="lg" className="w-full" disabled={busy !== null}>
          {busy === "email" && <Loader2 className="animate-spin" />}
          {mode === "signin" ? `Sign in as ${meta.label}` : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        <Button variant="pill-outline" size="lg" className="w-full" onClick={() => handleOAuth("google")} disabled={busy !== null}>
          {busy === "google" && <Loader2 className="animate-spin" />}
          Continue with Google
        </Button>
        <button type="button" className="lovable-auth-button w-full" onClick={() => handleOAuth("lovable")} disabled={busy !== null}>
          Continue with Lovable
        </button>
      </div>

      <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Are you a {other.label.toLowerCase()}?{" "}
        <Link to={other.authPath} className="font-bold text-primary hover:underline">
          Use the {other.label.toLowerCase()} sign-in
        </Link>
      </p>
    </div>
  );
}
