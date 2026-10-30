import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCheck, Check, Info, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useSession } from "@/lib/use-session";
import { markRead, messageSchemaMax } from "@/lib/enquiries";

export const Route = createFileRoute("/_authenticated/account/enquiries/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — PUPUK Education" },
      { name: "description", content: "Your conversation about a tutor enquiry." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Conversation,
});

type Msg = { id: string; sender_role: string; body: string; created_at: string };

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function Conversation() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const userId = user?.id;
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ["thread", id, userId],
    enabled: !!userId,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: enquiry, error } = await supabase.from("tutor_enquiries").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!enquiry) return null;
      const [{ data: tp }, { data: msgs }, { data: reads }] = await Promise.all([
        supabase.from("teacher_profiles").select("id, user_id").eq("id", enquiry.teacher_profile_id).maybeSingle(),
        supabase.from("enquiry_messages").select("id, sender_role, body, created_at").eq("enquiry_id", id).order("created_at"),
        supabase.from("enquiry_reads").select("user_id, last_read_at").eq("enquiry_id", id),
      ]);
      const ids = [tp?.user_id, enquiry.student_user_id].filter((x): x is string => !!x);
      const { data: people } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
      const name = (uid?: string | null) => people?.find((p) => p.id === uid)?.display_name ?? null;
      const myRole = enquiry.student_user_id === userId ? "student" : tp?.user_id === userId ? "teacher" : null;
      const otherId = myRole === "student" ? tp?.user_id : enquiry.student_user_id;
      return {
        enquiry,
        myRole,
        tutorName: name(tp?.user_id) ?? "Tutor",
        studentName: enquiry.student_user_id ? name(enquiry.student_user_id) ?? "Student" : "Guest visitor",
        messages: (msgs ?? []) as Msg[],
        otherReadAt: reads?.find((r) => r.user_id === otherId)?.last_read_at ?? null,
      };
    },
  });

  const data = thread.data;
  const msgCount = data?.messages.length ?? 0;
  useEffect(() => {
    if (!userId || !data?.myRole) return;
    markRead(id, userId).then(() => qc.invalidateQueries({ queryKey: ["inbox"] }));
  }, [id, userId, data?.myRole, msgCount, qc]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgCount]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userId) return;
    if (body.length > messageSchemaMax) { setError(`Messages must be under ${messageSchemaMax} characters.`); return; }
    setSending(true); setError(null);
    const { error: err } = await supabase.from("enquiry_messages").insert({ enquiry_id: id, sender_user_id: userId, sender_role: data!.myRole!, body });
    setSending(false);
    if (err) { setError("Your message wasn't sent. Please try again."); return; }
    setDraft("");
    await thread.refetch();
  }

  const back = data?.myRole === "teacher" ? "/account/teacher" : "/account/student";

  if (thread.isLoading || !userId) {
    return <Shell><div className="grid place-items-center p-20"><Loader2 className="size-8 animate-spin text-primary" /></div></Shell>;
  }
  if (!data) {
    return (
      <Shell>
        <div className="card-soft mx-auto mt-10 max-w-md p-8 text-center">
          <h1 className="text-2xl font-extrabold">Conversation not found</h1>
          <p className="mt-2 text-muted-foreground">It may belong to another account, or the link is incorrect.</p>
          <Button variant="pill" className="mt-6" asChild><Link to="/account/student">Back to my account</Link></Button>
        </div>
      </Shell>
    );
  }

  const { enquiry, myRole } = data;
  const counterpart = myRole === "teacher" ? data.studentName : data.tutorName;
  const isGuest = !enquiry.student_user_id;
  // The original enquiry is the first message in the thread.
  const all: Msg[] = [
    { id: "initial", sender_role: "student", body: enquiry.message || `Hi! I'm looking for help with ${enquiry.subject} (${enquiry.education_level}).`, created_at: enquiry.created_at },
    ...data.messages,
  ];

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 sm:px-6">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 py-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="size-10 rounded-full" asChild aria-label="Back">
            <Link to={back}><ArrowLeft /></Link>
          </Button>
          <span className="grid size-11 place-items-center rounded-full bg-mint font-display font-extrabold text-primary">{counterpart.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold">{counterpart}</h1>
            <p className="truncate text-xs font-semibold text-muted-foreground">{enquiry.subject} · {enquiry.education_level}</p>
          </div>
          {myRole === "student" && (
            <Button variant="pill-outline" size="sm" className="ml-auto hidden sm:inline-flex" asChild>
              <Link to="/tutors/$id" params={{ id: enquiry.teacher_profile_id }}>View tutor</Link>
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-3 py-6" aria-live="polite">
          {all.map((m, i) => {
            const mine = m.sender_role === myRole;
            const showDay = i === 0 || dayLabel(all[i - 1].created_at) !== dayLabel(m.created_at);
            const seen = mine && data.otherReadAt && new Date(data.otherReadAt) >= new Date(m.created_at);
            return (
              <div key={m.id}>
                {showDay && <p className="my-4 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">{dayLabel(m.created_at)}</p>}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-3xl px-4 py-3 sm:max-w-[70%] ${mine ? "rounded-br-lg bg-primary text-primary-foreground" : "rounded-bl-lg bg-card shadow-soft"}`}>
                    {i === 0 && <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${mine ? "text-primary-foreground/75" : "text-primary"}`}>Original enquiry</p>}
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
                    <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                      {timeOf(m.created_at)}
                      {mine && (seen ? <><CheckCheck className="size-3.5" /> Seen</> : <><Check className="size-3.5" /> Sent</>)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/95 py-3 backdrop-blur">
          {!myRole ? (
            <p className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold"><Info className="size-4" /> You're viewing this conversation as an administrator.</p>
          ) : isGuest ? (
            <p className="flex items-start gap-2 rounded-2xl bg-butter px-4 py-3 text-sm font-semibold">
              <Info className="mt-0.5 size-4 shrink-0" />
              This enquiry was sent by a guest without an account, so they can't receive replies here. They're invited to sign in as a student and contact you again to start a private conversation.
            </p>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2">
              <label htmlFor="reply" className="sr-only">Write a message</label>
              <textarea id="reply" rows={1} value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
                placeholder={`Message ${counterpart}…`}
                className="max-h-40 min-h-12 flex-1 resize-y rounded-3xl border border-border bg-card px-4 py-3 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring" />
              <Button type="submit" variant="pill" size="icon" className="size-12 shrink-0" disabled={sending || !draft.trim()} aria-label="Send message">
                {sending ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </form>
          )}
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
