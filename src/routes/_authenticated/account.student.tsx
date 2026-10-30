import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Inbox, Loader2, MessageCircleHeart, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EditableField } from "@/components/site/EditableField";
import { InboxList } from "@/components/site/InboxList";
import { useSession } from "@/lib/use-session";
import { ensureRoleProfile, getMyRoles } from "@/lib/account-data";
import { displayNameSchema } from "@/lib/account";
import { fetchInbox } from "@/lib/enquiries";
import { studentLevels } from "@/data/sample";

export const Route = createFileRoute("/_authenticated/account/student")({
  head: () => ({
    meta: [
      { title: "My Student Area — PUPUK Education" },
      { name: "description", content: "Your enquiries, tutor conversations and student profile on PUPUK Education." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentArea,
});

function StudentArea() {
  const { user } = useSession();
  const qc = useQueryClient();
  const userId = user?.id;
  const [addingRole, setAddingRole] = useState(false);

  const rolesQuery = useQuery({ queryKey: ["roles", userId], queryFn: () => getMyRoles(userId!), enabled: !!userId });
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
  const inbox = useQuery({
    queryKey: ["inbox", "student", userId],
    queryFn: () => fetchInbox(userId!, "student"),
    enabled: !!userId && hasRole,
    refetchInterval: 30000,
  });

  async function handleAddRole() {
    if (!userId) return;
    setAddingRole(true);
    try {
      await ensureRoleProfile(userId, "student");
      toast.success("Student profile added to your account.");
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the student role.");
    } finally {
      setAddingRole(false);
    }
  }

  async function saveName(v: string) {
    const parsed = displayNameSchema.safeParse(v);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", userId!);
    if (error) throw new Error("Couldn't save your name. Please try again.");
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success("Name updated.");
  }
  async function saveLevel(v: string) {
    const { error } = await supabase.from("student_profiles").update({ education_level: v || null, completed_at: new Date().toISOString() }).eq("user_id", userId!);
    if (error) throw new Error("Couldn't save your level. Please try again.");
    await qc.invalidateQueries({ queryKey: ["student_profile", userId] });
    toast.success("Education level updated.");
  }

  const loading = !userId || rolesQuery.isLoading || (hasRole && (profileQuery.isLoading || studentQuery.isLoading));
  const name = profileQuery.data?.display_name ?? "";
  const threads = inbox.data ?? [];
  const unread = threads.filter((t) => t.unread).length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-12">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Student area</p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">Hi{name ? `, ${name.split(" ")[0]}` : ""}! 👋</h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
              {unread > 0 ? `You have ${unread} new ${unread === 1 ? "reply" : "replies"} from tutors.` : "Your learning home on PUPUK Education."}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-10">
          {loading ? (
            <div className="card-soft grid place-items-center p-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : !hasRole ? (
            <div className="card-soft mx-auto max-w-lg p-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-mint text-primary"><UserPlus className="size-7" /></span>
              <h2 className="mt-5 text-2xl font-extrabold">Add a student profile?</h2>
              <p className="mt-3 text-muted-foreground">Your account is set up as a tutor. Add a student profile to the same account — no second email needed.</p>
              <Button variant="pill" size="lg" className="mt-6" onClick={handleAddRole} disabled={addingRole}>
                {addingRole && <Loader2 className="animate-spin" />} Add student profile
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <section className="card-soft p-5 sm:p-7" aria-labelledby="enquiries-h">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="enquiries-h" className="flex items-center gap-2 text-xl font-extrabold">
                    <Inbox className="size-5 text-primary" /> My Enquiries
                    {unread > 0 && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{unread} new</span>}
                  </h2>
                  {threads.length > 0 && (
                    <Button variant="pill-outline" size="sm" asChild><Link to="/tutors"><Search /> Find more</Link></Button>
                  )}
                </div>
                {inbox.isLoading ? (
                  <div className="grid place-items-center p-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
                ) : inbox.isError ? (
                  <p role="alert" className="mt-4 text-sm font-semibold text-destructive">We couldn't load your enquiries. Please refresh the page.</p>
                ) : threads.length === 0 ? (
                  <div className="mt-4 rounded-3xl bg-mint/50 p-8 text-center">
                    <MessageCircleHeart className="mx-auto size-10 text-primary" />
                    <h3 className="mt-3 text-lg font-extrabold">No conversations yet</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                      Find a tutor you like, open their profile and tap <strong>Connect</strong>. Their replies will show up right here.
                    </p>
                    <Button variant="pill" className="mt-5" asChild><Link to="/tutors"><Search /> Browse tutors</Link></Button>
                  </div>
                ) : (
                  <div className="mt-3 -mx-2"><InboxList threads={threads} /></div>
                )}
              </section>

              <div className="space-y-6">
                <section className="card-soft p-5 sm:p-7" aria-labelledby="profile-h">
                  <h2 id="profile-h" className="text-xl font-extrabold">My profile</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Tap the pencil to update a detail.</p>
                  <div className="mt-2">
                    <EditableField label="Name" value={name} onSave={saveName} />
                    <div className="border-b border-border py-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</p>
                      <p className="mt-0.5 text-[15px] font-semibold">{user?.email}</p>
                    </div>
                    <EditableField label="Education level" kind="select" options={studentLevels} value={studentQuery.data?.education_level ?? ""} onSave={saveLevel} />
                  </div>
                </section>
                <section className="card-soft bg-mint p-5 sm:p-7">
                  <h2 className="text-lg font-extrabold">Keep learning</h2>
                  <p className="mt-1 text-sm text-foreground/75">Browse tutors or explore learning materials anytime.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="pill" size="sm" asChild><Link to="/tutors"><Search /> Find tutors</Link></Button>
                    <Button variant="pill-outline" size="sm" asChild><a href="/#materials"><BookOpen /> Materials</a></Button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
