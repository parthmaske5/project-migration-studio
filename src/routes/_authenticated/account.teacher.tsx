import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Clock, ExternalLink, Inbox, Loader2, MailOpen, PenLine, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InboxList } from "@/components/site/InboxList";
import { TeacherProfileEditor } from "@/components/site/TeacherProfileEditor";
import { useSession } from "@/lib/use-session";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";
import { fetchInbox } from "@/lib/enquiries";
import { listingState, missingRequired, profileCompleteness } from "@/lib/completeness";

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

function TeacherDashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const userId = user?.id;
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
  const photoQuery = useQuery({
    queryKey: ["teacher_photo", teacher?.photo_url],
    queryFn: async () => (await supabase.storage.from("tutor-photos").createSignedUrl(teacher!.photo_url!, 3600)).data?.signedUrl ?? null,
    enabled: !!teacher?.photo_url,
  });
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
      toast.success("Tutor profile added to your account.");
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the tutor profile.");
    } finally {
      setAddingRole(false);
    }
  }

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["teacher_profile", userId] }),
    qc.invalidateQueries({ queryKey: ["profile", userId] }),
  ]).then(() => undefined);

  const loading = !userId || rolesQuery.isLoading || (hasRole && (profileQuery.isLoading || teacherQuery.isLoading));
  const name = profileQuery.data?.display_name ?? "";
  const threads = inbox.data ?? [];
  const unread = threads.filter((t) => t.unread).length;
  const listing = teacher ? { ...teacher, display_name: name } : null;
  const state = listing ? listingState(listing) : "incomplete";
  const missing = listing ? missingRequired(listing) : [];
  const completeness = listing ? profileCompleteness(listing) : { percent: 0, missing: [] };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero">
          <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-8 sm:px-6 md:py-10">
            {teacher && userId && (
              <PhotoPicker userId={userId} name={name} current={photoQuery.data ?? null} onSaved={refresh} />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">Teacher dashboard</p>
              <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Hi{name ? `, ${name.split(" ")[0]}` : ""}! 👋</h1>
              <p className="mt-1 text-muted-foreground">
                {unread > 0 ? `${unread} ${unread === 1 ? "student is" : "students are"} waiting to hear from you.` : "Good to see you. Here's how things look today."}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          {loading ? (
            <div className="card-soft grid place-items-center p-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : !hasRole || !teacher ? (
            <div className="card-soft mx-auto max-w-lg p-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-peach text-primary"><UserPlus className="size-7" /></span>
              <h2 className="mt-5 text-2xl font-extrabold">Create a tutor profile?</h2>
              <p className="mt-3 text-muted-foreground">This email is currently registered as a Student. Would you like to create a Tutor profile with this account?</p>
              <div className="mt-6 flex flex-col gap-2">
                <Button variant="pill" size="lg" onClick={handleAddRole} disabled={addingRole}>
                  {addingRole && <Loader2 className="animate-spin" />} Continue as Teacher
                </Button>
                <Button variant="pill-outline" asChild><Link to="/account/student">Go to Student Portal instead</Link></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <StatusBanner state={state} missing={missing} percent={completeness.percent} teacherId={teacher.id} />

              <section className={`card-soft p-5 sm:p-7 ${unread > 0 ? "ring-2 ring-primary/40" : ""}`} aria-labelledby="inbox-h">
                <h2 id="inbox-h" className="flex flex-wrap items-center gap-2 text-xl font-extrabold">
                  <Inbox className="size-5 text-primary" /> Enquiries
                  {unread > 0 && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{unread} new</span>}
                </h2>
                {inbox.isLoading ? (
                  <div className="grid place-items-center p-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
                ) : inbox.isError ? (
                  <p role="alert" className="mt-4 text-sm font-semibold text-destructive">We couldn't load your enquiries. Please refresh the page.</p>
                ) : threads.length === 0 ? (
                  <div className="mt-4 flex items-start gap-4 rounded-2xl bg-peach/60 p-5">
                    <MailOpen className="size-8 shrink-0 text-primary" />
                    <div>
                      <h3 className="font-extrabold">No enquiries yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {state === "live"
                          ? "When students contact you from your profile, their messages will appear here."
                          : "Students can contact you once your listing is complete and approved. Enquiries will appear here."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 -mx-2"><InboxList threads={threads} /></div>
                )}
              </section>

              {userId && (
                <TeacherProfileEditor
                  key={teacher.id}
                  userId={userId}
                  teacher={teacher}
                  name={name}
                  startEditing={!teacher.completed_at && missing.length > 0}
                  onSaved={refresh}
                />
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBanner({ state, missing, percent, teacherId }: { state: ReturnType<typeof listingState>; missing: string[]; percent: number; teacherId: string }) {
  const meta = {
    incomplete: { icon: PenLine, cls: "bg-butter", title: "Profile incomplete", text: `Add your ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""} so your listing can be reviewed.` },
    pending: { icon: Clock, cls: "bg-secondary", title: "Pending admin approval", text: "Your profile is complete. An admin will review it before it appears in the tutor directory." },
    rejected: { icon: PenLine, cls: "bg-rose", title: "Changes requested", text: "An admin asked for changes. Update your profile and it will be reviewed again." },
    live: { icon: CheckCircle2, cls: "bg-mint", title: "Live in the directory", text: "Students can find your profile and contact you." },
  }[state];
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4 ${meta.cls}`} role="status">
      <meta.icon className="size-6 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{meta.title}</p>
        <p className="text-sm text-muted-foreground">{meta.text}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-28" aria-label={`Profile ${percent}% complete`}>
          <div className="h-2 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{percent}% complete</p>
        </div>
        {state === "live" && (
          <Button variant="pill-outline" size="sm" asChild>
            <Link to="/tutors/$id" params={{ id: teacherId }}><ExternalLink /> View</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function PhotoPicker({ userId, name, current, onSaved }: { userId: string; name: string; current: string | null; onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB."); return; }
    setFile(f);
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    try {
      const path = `${userId}/photo-${Date.now()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
      const { error: upErr } = await supabase.storage.from("tutor-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("teacher_profiles").update({ photo_url: path }).eq("user_id", userId);
      if (error) throw error;
      await onSaved();
      setFile(null);
      toast.success("Photo updated.");
    } catch {
      toast.error("We couldn't upload your photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const src = preview ?? current;
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <label className="group relative block size-20 cursor-pointer rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring md:size-24">
        {src ? (
          <img src={src} alt={preview ? "New photo preview" : "Your profile photo"} className="size-full rounded-full border-4 border-card object-cover shadow-soft" />
        ) : (
          <span className="grid size-full place-items-center rounded-full border-4 border-card bg-peach text-2xl font-extrabold text-primary shadow-soft">{initials}</span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
          <Camera className="size-4" />
        </span>
        <input type="file" accept="image/*" className="sr-only" aria-label="Change profile photo" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {file && (
        <div className="flex gap-1">
          <Button size="sm" variant="pill" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setFile(null)} disabled={busy} aria-label="Cancel new photo"><X /></Button>
        </div>
      )}
    </div>
  );
}
