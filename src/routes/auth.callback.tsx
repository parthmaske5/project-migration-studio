import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { otherRole, roleMeta, type AppRole } from "@/lib/account";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";
import { OAUTH_ROLE_KEY } from "@/components/site/AuthForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — PUPUK Education" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [choice, setChoice] = useState<{ role: AppRole; userId: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        if (!cancelled) navigate({ to: "/auth" });
        return;
      }
      const stored = sessionStorage.getItem(OAUTH_ROLE_KEY);
      sessionStorage.removeItem(OAUTH_ROLE_KEY);
      const role: AppRole = stored === "teacher" ? "teacher" : "student";
      try {
        const roles = await getMyRoles(session.user.id);
        if (roles.length > 0 && !roles.includes(role)) {
          if (!cancelled) setChoice({ role, userId: session.user.id });
          return;
        }
        await ensureRoleProfile(session.user.id, role);
        if (!cancelled) navigate({ to: roleMeta[role].area });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (choice) {
    const meta = roleMeta[choice.role];
    const other = roleMeta[otherRole(choice.role)];
    return (
      <div className="card-soft w-full max-w-md p-8 text-center" role="alertdialog" aria-labelledby="xrole-h">
        <h1 id="xrole-h" className="text-2xl font-extrabold">You already have a {other.label.toLowerCase()} account</h1>
        <p className="mt-3 text-muted-foreground">
          {choice.role === "student"
            ? "This email is currently registered as a Teacher. Would you like to continue and add a Student profile to your account?"
            : "This email is currently registered as a Student. Would you like to create a Tutor profile with this account?"}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="pill" size="lg" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await ensureRoleProfile(choice.userId, choice.role); navigate({ to: meta.area }); }
            catch { setChoice(null); setFailed(true); }
          }}>
            {busy && <Loader2 className="animate-spin" />} Continue as {meta.label}
          </Button>
          <Button variant="pill-outline" size="lg" disabled={busy} onClick={() => navigate({ to: other.area })}>
            {choice.role === "student" ? "Go to Teacher Dashboard instead" : "Go to Student Portal instead"}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}>
            Sign out &amp; use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft w-full max-w-md p-8 text-center">
      {failed ? (
        <>
          <h1 className="text-2xl font-extrabold">We couldn't finish signing you in</h1>
          <p className="mt-3 text-muted-foreground">Please try again from the sign-in page.</p>
          <Button variant="pill" className="mt-6" onClick={() => navigate({ to: "/auth" })}>
            Back to sign in
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-4 font-bold">Signing you in…</p>
        </>
      )}
    </div>
  );
}
