import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { studentLevels } from "@/data/sample";
import { useSession } from "@/lib/use-session";

export const enquirySchema = z.object({
  level: z.string().trim().min(1, "Choose a grade or level").max(60),
  subject: z.string().trim().min(1, "Choose or type a subject").max(80, "Subject is too long"),
  message: z.string().trim().max(1000, "Message must be under 1000 characters"),
});

const inputCls = "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary";

type Props = { open: boolean; onClose: () => void; teacherProfileId: string; tutorName: string; subjects: string[]; levels: string[] };

export function EnquiryDialog({ open, onClose, teacherProfileId, tutorName, subjects, levels }: Props) {
  const { user } = useSession();
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"level" | "subject" | "message", string>>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const levelOptions = levels.length ? levels : studentLevels;

  function close() {
    onClose();
    if (state === "sent") { setLevel(""); setSubject(""); setMessage(""); setState("idle"); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = enquirySchema.safeParse({ level, subject, message });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setState("sending");
    const { error } = await supabase.from("tutor_enquiries").insert({
      teacher_profile_id: teacherProfileId,
      student_user_id: user?.id ?? null,
      education_level: parsed.data.level,
      subject: parsed.data.subject,
      message: parsed.data.message || null,
    });
    setState(error ? "error" : "sent");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {state === "sent" ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-primary" />
            <DialogTitle className="mt-4 text-xl">Enquiry sent</DialogTitle>
            <DialogDescription className="mt-2">
              Your enquiry has been saved for {tutorName}. They'll see it in their tutor dashboard.
            </DialogDescription>
            <Button variant="pill" className="mt-6" onClick={close}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connect with {tutorName}</DialogTitle>
              <DialogDescription>Tell the tutor what you need help with. It only takes a moment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Grade / educational level *</span>
                <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} aria-invalid={!!errors.level}>
                  <option value="">Choose a level</option>
                  {levelOptions.map((l) => <option key={l}>{l}</option>)}
                </select>
                {errors.level && <span className="mt-1 block text-xs font-semibold text-destructive">{errors.level}</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Subject *</span>
                <input className={inputCls} list="enquiry-subjects" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Pick from the list or type a subject" aria-invalid={!!errors.subject} />
                <datalist id="enquiry-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
                {errors.subject && <span className="mt-1 block text-xs font-semibold text-destructive">{errors.subject}</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Additional message (optional)</span>
                <textarea className={`${inputCls} min-h-28 resize-y`} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. My child needs help with algebra before the SPM trial exam." />
                {errors.message && <span className="mt-1 block text-xs font-semibold text-destructive">{errors.message}</span>}
              </label>
              {state === "error" && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
                  Your enquiry couldn't be sent. Please try again.
                </p>
              )}
              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={close} disabled={state === "sending"}>Cancel</Button>
                <Button type="submit" variant="pill" disabled={state === "sending"}>
                  {state === "sending" && <Loader2 className="animate-spin" />} Submit Enquiry
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
