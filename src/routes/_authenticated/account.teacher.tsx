import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Inbox, Loader2, MapPin, Pencil, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OnboardingDialog } from "@/components/site/OnboardingDialog";
import { useSession } from "@/lib/use-session";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";

export const Route = createFileRoute("/_authenticated/account/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — PUPUK Education" },
      { name: "description", content: "Manage your tutor listing on PUPUK Education." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeacherDashboard,
});

const statusMeta = {
  pending: { label: "Pending approval", cls: "bg-butter text-accent-foreground" },
  approved: { label: "Approved", cls: "bg-mint text-primary" },
  rejected: { label: "Needs changes", cls: "bg-rose text-destructive" },
} as const;

function TeacherDashboard() {
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
  const hasRole = (rolesQuery.data ?? []).includes("teacher");

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle()).data,
    enabled: !!userId && hasRole,
  });
  const teacherQuery = useQuery({
    queryKey: ["teacher_profile", userId],
    queryFn: async () => (await supabase.from("teacher_profiles").select("*").eq("user_id", userId!).maybeSingle()).data,
    enabled: !!userId && hasRole,
  });

  const teacher = teacherQuery.data;
  const enquiriesQuery = useQuery({
    queryKey: ["enquiries", teacher?.id],
    queryFn: async () =>
      (await supabase.from("tutor_enquiries").select("*").eq("teacher_profile_id", teacher!.id).order("created_at", { ascending: false }).limit(20)).data ?? [],
    enabled: !!teacher?.id,
  });
  useEffect(() => {
    if (teacher && !teacher.completed_at) setDialogOpen(true);
  }, [teacher]);

  async function handleAddRole() {
    if (!userId) return;
    setAddingRole(true);
    try {
      await ensureRoleProfile(userId, "teacher");
      toast.success("Teacher profile added to your account.");
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the teacher role.");
    } finally {
      setAddingRole(false);
    }
  }

  const loading = !userId || rolesQuery.isLoading || (hasRole && (profileQuery.isLoading || teacherQuery.isLoading));
  const status = statusMeta[(teacher?.status ?? "pending") as keyof typeof statusMeta] ?? statusMeta.pending;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Teacher dashboard</p>
            <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">
              Hi{profileQuery.data?.display_name ? `, ${profileQuery.data.display_name}` : ""}!
            </h1>
            <p className="mt-3 max-w-xl text-lg text-muted-foreground">Manage your tutor listing and account.</p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {loading ? (
            <div className="card-soft grid place-items-center p-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : !hasRole ? (
            <div className="card-soft mx-auto max-w-lg p-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-peach text-primary">
                <UserPlus className="size-7" />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold">No teacher profile yet</h2>
              <p className="mt-3 text-muted-foreground">
                This account doesn't have a teacher profile. Add one to your existing account — no second email needed.
              </p>
              <Button variant="pill" size="lg" className="mt-6" onClick={handleAddRole} disabled={addingRole}>
                {addingRole && <Loader2 className="animate-spin" />}
                Add Teacher role to my account
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
              <div className="card-soft h-fit p-7">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-peach text-primary">
                    <BookOpen className="size-6" />
                  </span>
                  <Button variant="pill-outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Pencil /> {teacher?.completed_at ? "Edit listing" : "Complete listing"}
                  </Button>
                </div>
                <h2 className="mt-4 text-xl font-extrabold">{profileQuery.data?.display_name ?? "Your tutor listing"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{teacher?.qualification ?? user?.email}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(teacher?.subjects ?? []).map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                      {s}
                    </span>
                  ))}
                </div>
                <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-muted-foreground">Teaching mode</dt>
                    <dd className="font-bold">{teacher?.teaching_mode ?? "Not set yet"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-muted-foreground">Location</dt>
                    <dd className="font-bold">{teacher?.location ?? "Not set yet"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-muted-foreground">Hourly fee</dt>
                    <dd className="font-bold">{teacher?.fee_per_hour != null ? `RM${teacher.fee_per_hour}` : "Not set yet"}</dd>
                  </div>
                </dl>
                {teacher?.bio && <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{teacher.bio}</p>}
              </div>

              <div className="space-y-6">
                <div className="card-soft p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold">Listing status</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {teacher?.status === "approved"
                      ? "Your listing is approved and can appear in the public tutor directory."
                      : teacher?.status === "rejected"
                        ? "An admin asked for changes. Update your listing and it will be reviewed again."
                        : "New listings stay hidden from the public directory until an admin approves them. You can keep editing meanwhile."}
                  </p>
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">
                    <ShieldCheck className="size-4 shrink-0" /> Only you can edit this listing.
                  </div>
                </div>
                {teacher?.status === "approved" && (
                  <Button variant="pill-outline" asChild>
                    <Link to="/tutors/$id" params={{ id: teacher.id }}><ExternalLink /> View my public profile</Link>
                  </Button>
                )}
                <div className="card-soft p-7">
                  <h2 className="flex items-center gap-2 text-xl font-extrabold"><Inbox className="size-5 text-primary" /> Student enquiries</h2>
                  {(enquiriesQuery.data ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No enquiries yet. They'll appear here when students connect with you.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {enquiriesQuery.data!.map((q) => (
                        <li key={q.id} className="rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
                          <p className="font-bold">{q.subject} · {q.education_level}</p>
                          {q.message && <p className="mt-1 text-muted-foreground">{q.message}</p>}
                          <p className="mt-1 text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString()}{q.student_user_id ? " · signed-in student" : " · guest visitor"}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" /> Students browse the directory without an account, so a complete listing
                  helps you get discovered.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />

      {userId && (
        <OnboardingDialog
          role="teacher"
          userId={userId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            queryClient.invalidateQueries();
          }}
          initialName={profileQuery.data?.display_name ?? ""}
          initialTeacher={teacher ?? null}
        />
      )}
    </div>
  );
}
