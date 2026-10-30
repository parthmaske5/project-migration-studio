import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Loader2, Pencil, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OnboardingDialog } from "@/components/site/OnboardingDialog";
import { useSession } from "@/lib/use-session";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";

export const Route = createFileRoute("/_authenticated/account/student")({
  head: () => ({
    meta: [
      { title: "My Student Area — PUPUK Education" },
      { name: "description", content: "Your student account on PUPUK Education." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentArea,
});

function StudentArea() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingRole, setAddingRole] = useState(false);

  const rolesQuery = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => getMyRoles(userId!),
    enabled: !!userId,
  });
  const hasRole = (rolesQuery.data ?? []).includes("student");

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle()).data,
    enabled: !!userId && hasRole,
  });
  const studentQuery = useQuery({
    queryKey: ["student_profile", userId],
    queryFn: async () => (await supabase.from("student_profiles").select("*").eq("user_id", userId!).maybeSingle()).data,
    enabled: !!userId && hasRole,
  });

  const student = studentQuery.data;
  // First visit with an unfinished profile: invite (never force) the onboarding dialog.
  useEffect(() => {
    if (student && !student.completed_at) setDialogOpen(true);
  }, [student]);

  async function handleAddRole() {
    if (!userId) return;
    setAddingRole(true);
    try {
      await ensureRoleProfile(userId, "student");
      toast.success("Student profile added to your account.");
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the student role.");
    } finally {
      setAddingRole(false);
    }
  }

  const loading = !userId || rolesQuery.isLoading || (hasRole && (profileQuery.isLoading || studentQuery.isLoading));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Student area</p>
            <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">
              Hi{profileQuery.data?.display_name ? `, ${profileQuery.data.display_name}` : ""}!
            </h1>
            <p className="mt-3 max-w-xl text-lg text-muted-foreground">Your learning home on PUPUK Education.</p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {loading ? (
            <div className="card-soft grid place-items-center p-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : !hasRole ? (
            <div className="card-soft mx-auto max-w-lg p-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-mint text-primary">
                <UserPlus className="size-7" />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold">No student profile yet</h2>
              <p className="mt-3 text-muted-foreground">
                This account doesn't have a student profile. Add one to your existing account — no second email needed.
              </p>
              <Button variant="pill" size="lg" className="mt-6" onClick={handleAddRole} disabled={addingRole}>
                {addingRole && <Loader2 className="animate-spin" />}
                Add Student role to my account
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
              <div className="card-soft h-fit p-7">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-mint text-primary">
                    <GraduationCap className="size-6" />
                  </span>
                  <Button variant="pill-outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Pencil /> {student?.completed_at ? "Edit profile" : "Complete profile"}
                  </Button>
                </div>
                <h2 className="mt-4 text-xl font-extrabold">{profileQuery.data?.display_name ?? "Your profile"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
                <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-muted-foreground">Education level</dt>
                    <dd className="font-bold">{student?.education_level ?? "Not set yet"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-muted-foreground">Profile status</dt>
                    <dd className={`font-bold ${student?.completed_at ? "text-primary" : "text-accent-foreground"}`}>
                      {student?.completed_at ? "Complete" : "Incomplete — finish anytime"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-6">
                <div className="card-soft bg-mint p-7">
                  <h2 className="text-xl font-extrabold">Ready to keep learning?</h2>
                  <p className="mt-2 text-foreground/75">Browse the tutor directory or explore learning materials — no account needed to look around.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button variant="pill" asChild>
                      <Link to="/tutors">
                        <Search /> Find tutors
                      </Link>
                    </Button>
                    <Button variant="pill-outline" asChild>
                      <a href="/#materials">
                        <BookOpen /> Learning materials
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="rounded-2xl bg-butter px-4 py-3 text-sm font-semibold">
                  Membership, saved tutors and downloads are on the way — your student area will grow with them.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />

      {userId && (
        <OnboardingDialog
          role="student"
          userId={userId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            queryClient.invalidateQueries();
          }}
          initialName={profileQuery.data?.display_name ?? ""}
          initialStudent={student ?? null}
        />
      )}
    </div>
  );
}
