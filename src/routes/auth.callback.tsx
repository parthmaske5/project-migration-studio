import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { roleMeta, type AppRole } from "@/lib/account";
import { ensureRoleProfile } from "@/lib/account-data";
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
