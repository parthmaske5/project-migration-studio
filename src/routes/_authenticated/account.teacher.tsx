import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Inbox, Loader2, MailOpen, SlidersHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OnboardingDialog } from "@/components/site/OnboardingDialog";
import { EditableField } from "@/components/site/EditableField";
import { InboxList } from "@/components/site/InboxList";
import { useSession } from "@/lib/use-session";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";
import { displayNameSchema, parseSubjects } from "@/lib/account";
import { fetchInbox } from "@/lib/enquiries";
import { profileCompleteness } from "@/lib/completeness";
import { malaysianLocations } from "@/data/sample";
import type { TablesUpdate } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/account/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — PUPUK Education" },
      { name: "description", content: "Reply to student enquiries and manage your tutor listing on PUPUK Education." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeacherDashboard,
});

const statusMeta = {
  pending: { label: "Pending approval", cls: "bg-butter text-accent-foreground", text: "New listings stay hidden from the public directory until an admin approves them. You can keep editing meanwhile." },
  approved: { label: "Approved", cls: "bg-mint text-primary", text: "Your listing is live in the public tutor directory." },
  rejected: { label: "Needs changes", cls: "bg-rose text-destructive", text: "An admin asked for changes. Update your listing and it will be reviewed again." },
} as const;

function TeacherDashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const userId = user?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingRole, setAddingRole] = useState(false);

  const rolesQuery = useQuery({ queryKey: ["roles", userId], queryFn: () => getMyRoles(userId!), enabled: !!userId });
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
  const inbox = useQuery({
    queryKey: ["inbox", "teacher", teacher?.id],
    queryFn: () => fetchInbox(userId!, "teacher", teacher!.id),
    enabled: !!teacher?.id,
    refetchInterval: 30000,
  });

  async function handleAddRole() {
    if (!userId) return;
    setAddingRole(true);
    try {
      await ensureRoleProfile(userId, "teacher");
      toast.success("Teacher profile added to your account.");
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the teacher role.");
    } finally {
      setAddingRole(false);
    }
  }

  async function update(patch: TablesUpdate<"teacher_profiles">, label: string) {
    const { error } = await supabase.from("teacher_profiles").update(patch).eq("user_id", userId!);
    if (error) throw new Error(`Couldn't save ${label.toLowerCase()}. Please try again.`);
    await qc.invalidateQueries({ queryKey: ["teacher_profile", userId] });
    toast.success(`${label} updated.`);
  }
  const text = (key: keyof TablesUpdate<"teacher_profiles">, label: string, max: number) => async (v: string) => {
    if (v.trim().length > max) throw new Error(`${label} must be under ${max} characters.`);
    await update({ [key]: v.trim() || null }, label);
  };
  async function saveName(v: string) {
    const parsed = displayNameSchema.safeParse(v);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", userId!);
    if (error) throw new Error("Couldn't save your name. Please try again.");
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success("Name updated.");
  }
  const num = (key: "fee_per_hour" | "years_experience", label: string, max: number) => async (v: string) => {
    if (v === "") return update({ [key]: null }, label);
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`Enter a number between 0 and ${max}.`);
    await update({ [key]: key === "years_experience" ? Math.round(n) : n }, label);
  };

  const loading = !userId || rolesQuery.isLoading || (hasRole && (profileQuery.isLoading || teacherQuery.isLoading));
  const status = statusMeta[(teacher?.status ?? "pending") as keyof typeof statusMeta] ?? statusMeta.pending;
  const name = profileQuery.data?.display_name ?? "";
  const threads = inbox.data ?? [];
  const unread = threads.filter((t) => t.unread).length;
  const completeness = teacher ? profileCompleteness({ ...teacher, display_name: name }) : { percent: 0, missing: [] };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Teacher dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">Hi{name ? `, ${name.split(" ")[0]}` : ""}! 👋</h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
              {unread > 0 ? `${unread} ${unread === 1 ? "student is" : "students are"} waiting to hear from you.` : "Here's what's happening with your tutoring."}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          {loading ? (
            <div className="card-soft grid place-items-center p-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : !hasRole ? (
            <div className="card-soft mx-auto max-w-lg p-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-peach text-primary"><UserPlus className="size-7" /></span>
              <h2 className="mt-5 text-2xl font-extrabold">Add a tutor profile?</h2>
              <p className="mt-3 text-muted-foreground">Your account is set up as a student. Add a tutor profile to the same account — no second email needed.</p>
              <Button variant="pill" size="lg" className="mt-6" onClick={handleAddRole} disabled={addingRole}>
                {addingRole && <Loader2 className="animate-spin" />} Add tutor profile
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-6">
                <section className="card-soft p-5 sm:p-7" aria-labelledby="inbox-h">
                  <h2 id="inbox-h" className="flex items-center gap-2 text-xl font-extrabold">
                    <Inbox className="size-5 text-primary" /> Enquiries inbox
                    {unread > 0 && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{unread} unread</span>}
                  </h2>
                  {inbox.isLoading ? (
                    <div className="grid place-items-center p-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
                  ) : inbox.isError ? (
                    <p role="alert" className="mt-4 text-sm font-semibold text-destructive">We couldn't load your enquiries. Please refresh the page.</p>
                  ) : threads.length === 0 ? (
                    <div className="mt-4 rounded-3xl bg-peach/60 p-8 text-center">
                      <MailOpen className="mx-auto size-10 text-primary" />
                      <h3 className="mt-3 text-lg font-extrabold">Your inbox is ready</h3>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                        {teacher?.status === "approved"
                          ? "When students contact you from your profile, their enquiries will appear here."
                          : "Once your listing is approved, students can find you and their enquiries will appear here."}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 -mx-2"><InboxList threads={threads} /></div>
                  )}
                </section>

                <section className="card-soft p-5 sm:p-7" aria-labelledby="listing-h">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 id="listing-h" className="text-xl font-extrabold">Your listing</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Tap the pencil to update a detail.</p>
                    </div>
                    <Button variant="pill-outline" size="sm" onClick={() => setDialogOpen(true)}>
                      <SlidersHorizontal /> Photo, qualifications & availability
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-x-8 md:grid-cols-2">
                    <EditableField label="Display name" value={name} onSave={saveName} />
                    <EditableField label="Tagline" value={teacher?.tagline ?? ""} placeholder="e.g. Making maths simpler" onSave={text("tagline", "Tagline", 120)} />
                    <EditableField label="Main qualification" value={teacher?.qualification ?? ""} onSave={text("qualification", "Qualification", 120)} />
                    <EditableField label="Subjects" value={(teacher?.subjects ?? []).join(", ")} hint="Separate subjects with commas (up to 10)."
                      display={teacher?.subjects?.length ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">{teacher.subjects.map((s) => <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{s}</span>)}</div>
                      ) : undefined}
                      onSave={async (v) => { if (v.length > 200) throw new Error("Subject list is too long."); await update({ subjects: parseSubjects(v) }, "Subjects"); }} />
                    <EditableField label="Teaching mode" kind="select" options={["Online", "In-person", "Online & In-person"]} value={teacher?.teaching_mode ?? ""} onSave={text("teaching_mode", "Teaching mode", 40)} />
                    <EditableField label="Location" kind="select" options={malaysianLocations} value={teacher?.location ?? ""} onSave={text("location", "Location", 60)} />
                    <EditableField label="Hourly fee (RM)" kind="number" value={teacher?.fee_per_hour != null ? String(teacher.fee_per_hour) : ""}
                      display={teacher?.fee_per_hour != null ? `RM${teacher.fee_per_hour} / hour` : undefined} onSave={num("fee_per_hour", "Hourly fee", 10000)} />
                    <EditableField label="Years of experience" kind="number" value={teacher?.years_experience != null ? String(teacher.years_experience) : ""} onSave={num("years_experience", "Experience", 60)} />
                  </div>
                  <EditableField label="About me" kind="textarea" value={teacher?.bio ?? ""} onSave={text("bio", "About me", 2000)}
                    display={teacher?.bio ? <p className="whitespace-pre-wrap font-normal text-muted-foreground">{teacher.bio}</p> : undefined} />
                </section>
              </div>

              <aside className="space-y-6">
                <section className="card-soft p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-extrabold">Listing status</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{status.text}</p>
                  {teacher?.status === "approved" ? (
                    <Button variant="pill" className="mt-4 w-full" asChild>
                      <Link to="/tutors/$id" params={{ id: teacher.id }}><ExternalLink /> View public profile</Link>
                    </Button>
                  ) : (
                    <Button variant="pill-outline" className="mt-4 w-full" disabled>
                      <ExternalLink /> Public profile available after approval
                    </Button>
                  )}
                </section>
                <section className="card-soft p-5 sm:p-7">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-extrabold">Profile completeness</h2>
                    <span className="font-display text-2xl font-extrabold text-primary">{completeness.percent}%</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={completeness.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness.percent}%` }} />
                  </div>
                  {completeness.missing.length > 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">Still to add: {completeness.missing.slice(0, 4).join(", ")}{completeness.missing.length > 4 ? "…" : ""}</p>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-primary">Lovely — your listing has everything students look for.</p>
                  )}
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />

      {userId && dialogOpen && (
        <OnboardingDialog
          role="teacher"
          userId={userId}
          open
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); qc.invalidateQueries(); }}
          initialName={name}
          initialTeacher={teacher ?? null}
        />
      )}
    </div>
  );
}
