import { useEffect, useState, type ReactNode } from "react";
import { useBlocker } from "@tanstack/react-router";
import { ChevronDown, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { displayNameSchema, parseSubjects, teacherProfileSchema } from "@/lib/account";
import { cleanAchievements, cleanAvailability, cleanQualifications } from "@/lib/tutor-data";
import { malaysianLocations, studentLevels } from "@/data/sample";

type Row = Record<string, string>;
const toRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]).map((r) => ({ ...r })) : []);
const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";
const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground";

type Draft = {
  name: string; tagline: string; bio: string; qualification: string; subjects: string; mode: string; location: string;
  fee: string; years: string; levels: string[]; curricula: string; languages: string; skills: string;
  quals: Row[]; achievements: Row[]; availability: Row[];
};

function toDraft(t: Tables<"teacher_profiles">, name: string): Draft {
  return {
    name, tagline: t.tagline ?? "", bio: t.bio ?? "", qualification: t.qualification ?? "", subjects: (t.subjects ?? []).join(", "),
    mode: t.teaching_mode ?? "", location: t.location ?? "", fee: t.fee_per_hour != null ? String(t.fee_per_hour) : "",
    years: t.years_experience != null ? String(t.years_experience) : "", levels: [...(t.levels ?? [])],
    curricula: (t.curricula ?? []).join(", "), languages: (t.languages ?? []).join(", "), skills: (t.skills ?? []).join(", "),
    quals: toRows(t.qualifications), achievements: toRows(t.achievements), availability: toRows(t.availability),
  };
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Value({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className={labelCls}>{label}</dt>
      <dd className="text-[15px] font-semibold">{children || <span className="font-normal text-muted-foreground">Not added yet</span>}</dd>
    </div>
  );
}

const Chips = ({ items }: { items: string[] }) =>
  items.length ? <div className="flex flex-wrap gap-1.5">{items.map((s) => <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{s}</span>)}</div> : null;

function Section({ title, summary, open, children }: { title: string; summary?: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="group border-t border-border py-1" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-extrabold">{title}</span>
          {summary && <span className="block text-sm text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  );
}

function ListEditor({ label, rows, setRows, fields, addLabel }: {
  label: string; rows: Row[]; setRows: (r: Row[]) => void; fields: { key: string; placeholder: string }[]; addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <input key={f.key} className={inputCls} placeholder={f.placeholder} aria-label={`${label} ${i + 1}: ${f.placeholder}`} value={r[f.key] ?? ""}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
            ))}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 /></Button>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing added yet.</p>}
      {rows.length < 10 && <Button type="button" variant="pill-outline" size="sm" onClick={() => setRows([...rows, {}])}><Plus /> {addLabel}</Button>}
    </div>
  );
}

type Props = { userId: string; teacher: Tables<"teacher_profiles">; name: string; startEditing: boolean; onSaved: () => Promise<void> | void };

export function TeacherProfileEditor({ userId, teacher, name, startEditing, onSaved }: Props) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState<Draft>(() => toDraft(teacher, name));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(teacher, name)));
  const dirty = editing && JSON.stringify(draft) !== baseline;

  useEffect(() => {
    if (!editing) { const d = toDraft(teacher, name); setDraft(d); setBaseline(JSON.stringify(d)); }
  }, [teacher, name, editing]);

  useBlocker({
    shouldBlockFn: () => dirty && !window.confirm("You have unsaved changes to your profile. Leave without saving?"),
    enableBeforeUnload: () => dirty,
  });

  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const on = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  function cancel() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setDraft(toDraft(teacher, name)); setError(null); setEditing(false);
  }

  async function save() {
    setError(null);
    const n = displayNameSchema.safeParse(draft.name);
    const p = teacherProfileSchema.safeParse({
      qualification: draft.qualification, subjects: draft.subjects, teachingMode: draft.mode, location: draft.location,
      feePerHour: draft.fee === "" ? 0 : Number(draft.fee), bio: draft.bio, tagline: draft.tagline, years: draft.years === "" ? 0 : Number(draft.years),
    });
    if (!n.success) return setError(n.error.issues[0]?.message ?? "Please check your name.");
    if (!p.success) return setError(p.error.issues[0]?.message ?? "Please check your details.");
    setBusy(true);
    try {
      const { error: nErr } = await supabase.from("profiles").update({ display_name: n.data }).eq("id", userId);
      if (nErr) throw nErr;
      const { error: tErr } = await supabase.from("teacher_profiles").update({
        tagline: p.data.tagline || null, bio: p.data.bio || null, qualification: p.data.qualification || null,
        subjects: parseSubjects(p.data.subjects), teaching_mode: p.data.teachingMode || null, location: p.data.location || null,
        fee_per_hour: draft.fee === "" ? null : p.data.feePerHour, years_experience: draft.years === "" ? null : p.data.years,
        levels: draft.levels, curricula: parseSubjects(draft.curricula), languages: parseSubjects(draft.languages), skills: parseSubjects(draft.skills),
        qualifications: cleanQualifications(draft.quals), achievements: cleanAchievements(draft.achievements), availability: cleanAvailability(draft.availability),
      }).eq("user_id", userId);
      if (tErr) throw tErr;
      setBaseline(JSON.stringify(draft));
      setEditing(false);
      await onSaved();
      toast.success("Profile saved.");
    } catch {
      setError("We couldn't save your profile. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const t = teacher;
  const quals = cleanQualifications(t.qualifications), ach = cleanAchievements(t.achievements), avail = cleanAvailability(t.availability);

  return (
    <section className="card-soft p-5 sm:p-7" aria-labelledby="profile-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="profile-h" className="text-xl font-extrabold">{editing ? "Edit your profile" : "Your profile"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing ? "Update anything below, then save once." : "This is what students see on your listing."}
          </p>
        </div>
        {!editing && <Button variant="pill" onClick={() => setEditing(true)}><Pencil /> Edit profile</Button>}
      </div>

      {editing ? (
        <form className="mt-5" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="grid gap-4 pb-4 sm:grid-cols-2">
            <Field label="Display name *"><input className={inputCls} value={draft.name} onChange={on("name")} placeholder="e.g. Aina Rahman" /></Field>
            <Field label="Headline / tagline *"><input className={inputCls} value={draft.tagline} onChange={on("tagline")} placeholder="e.g. Making maths simpler" /></Field>
            <div className="sm:col-span-2">
              <Field label="About you *"><textarea className={`${inputCls} min-h-28 resize-y`} value={draft.bio} onChange={on("bio")} placeholder="Tell students about your experience and teaching style." /></Field>
            </div>
          </div>
          <Section title="Teaching details" summary="Subjects, mode, location, fee and experience" open>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Main qualification *"><input className={inputCls} value={draft.qualification} onChange={on("qualification")} placeholder="e.g. B.Ed. (Mathematics), UPSI" /></Field>
              <Field label="Subjects *" hint="Separate with commas (up to 10)."><input className={inputCls} value={draft.subjects} onChange={on("subjects")} placeholder="e.g. Mathematics, Add Maths" /></Field>
              <Field label="Teaching mode *">
                <select className={inputCls} value={draft.mode} onChange={on("mode")}>
                  <option value="">Choose a mode</option><option>Online</option><option>In-person</option><option>Online & In-person</option>
                </select>
              </Field>
              <Field label="Location *">
                <select className={inputCls} value={draft.location} onChange={on("location")}>
                  <option value="">Choose a location</option>{malaysianLocations.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Hourly fee (RM) *"><input className={inputCls} type="number" min={0} step={5} value={draft.fee} onChange={on("fee")} placeholder="e.g. 60" /></Field>
              <Field label="Years of experience"><input className={inputCls} type="number" min={0} max={60} value={draft.years} onChange={on("years")} placeholder="e.g. 8" /></Field>
            </div>
          </Section>
          <Section title="Levels, curricula, languages & skills">
            <fieldset>
              <legend className={labelCls}>Levels you teach</legend>
              <div className="flex flex-wrap gap-2">
                {studentLevels.map((l) => (
                  <label key={l} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${draft.levels.includes(l) ? "border-primary bg-mint text-primary" : "border-border"}`}>
                    <input type="checkbox" className="sr-only" checked={draft.levels.includes(l)} onChange={(e) => set("levels")(e.target.checked ? [...draft.levels, l] : draft.levels.filter((x) => x !== l))} />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Curricula"><input className={inputCls} value={draft.curricula} onChange={on("curricula")} placeholder="KSSM, IGCSE" /></Field>
              <Field label="Languages"><input className={inputCls} value={draft.languages} onChange={on("languages")} placeholder="English, BM" /></Field>
              <Field label="Additional skills"><input className={inputCls} value={draft.skills} onChange={on("skills")} placeholder="Exam techniques" /></Field>
            </div>
          </Section>
          <Section title="Qualifications & education" summary={`${draft.quals.length} added`}>
            <ListEditor label="Qualification" rows={draft.quals} setRows={set("quals")} addLabel="Add qualification"
              fields={[{ key: "title", placeholder: "Qualification" }, { key: "institution", placeholder: "Institution" }, { key: "year", placeholder: "Year" }]} />
          </Section>
          <Section title="Achievements & certificates" summary={`${draft.achievements.length} added`}>
            <ListEditor label="Achievement" rows={draft.achievements} setRows={set("achievements")} addLabel="Add achievement"
              fields={[{ key: "title", placeholder: "Title" }, { key: "issuer", placeholder: "Issued by" }, { key: "year", placeholder: "Year" }, { key: "url", placeholder: "Certificate link (https://…)" }]} />
          </Section>
          <Section title="Availability" summary={`${draft.availability.length} time slots`}>
            <ListEditor label="Time slot" rows={draft.availability} setRows={set("availability")} addLabel="Add time slot"
              fields={[{ key: "day", placeholder: "Day, e.g. Saturday" }, { key: "time", placeholder: "Time, e.g. 9am – 12pm" }]} />
          </Section>

          <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-soft backdrop-blur">
            <Button type="submit" variant="pill" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>
            <Button type="button" variant="ghost" onClick={cancel} disabled={busy}><X /> Cancel</Button>
            <span className="text-xs text-muted-foreground">* needed for your listing to go live</span>
            {error && <p role="alert" className="w-full text-sm font-semibold text-destructive">{error}</p>}
          </div>
        </form>
      ) : (
        <div className="mt-5">
          <div className="pb-4">
            <p className="text-lg font-extrabold">{name || <span className="text-muted-foreground">Add your name</span>}</p>
            <p className="text-muted-foreground">{t.tagline || "Add a headline that sums up how you teach."}</p>
            <p className="mt-3 whitespace-pre-wrap text-[15px]">{t.bio || <span className="text-muted-foreground">Tell students about yourself in “About you”.</span>}</p>
          </div>
          <Section title="Teaching details" summary={[t.teaching_mode, t.location, t.fee_per_hour != null ? `RM${t.fee_per_hour}/hr` : ""].filter(Boolean).join(" · ") || "Not added yet"}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Value label="Main qualification">{t.qualification}</Value>
              <Value label="Subjects"><Chips items={t.subjects ?? []} /></Value>
              <Value label="Teaching mode">{t.teaching_mode}</Value>
              <Value label="Location">{t.location}</Value>
              <Value label="Hourly fee">{t.fee_per_hour != null ? `RM${t.fee_per_hour} / hour` : ""}</Value>
              <Value label="Experience">{t.years_experience != null ? `${t.years_experience} years` : ""}</Value>
            </dl>
          </Section>
          <Section title="Levels, curricula, languages & skills">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Value label="Levels"><Chips items={t.levels ?? []} /></Value>
              <Value label="Curricula"><Chips items={t.curricula ?? []} /></Value>
              <Value label="Languages"><Chips items={t.languages ?? []} /></Value>
              <Value label="Skills"><Chips items={t.skills ?? []} /></Value>
            </dl>
          </Section>
          <Section title="Qualifications & education" summary={`${quals.length} added`}>
            {quals.length ? <ul className="space-y-1 text-sm">{quals.map((q, i) => <li key={i}><strong>{q.title}</strong>{q.institution && ` — ${q.institution}`}{q.year && ` (${q.year})`}</li>)}</ul> : <p className="text-sm text-muted-foreground">Not added yet</p>}
          </Section>
          <Section title="Achievements & certificates" summary={`${ach.length} added`}>
            {ach.length ? <ul className="space-y-1 text-sm">{ach.map((a, i) => <li key={i}><strong>{a.title}</strong>{a.issuer && ` — ${a.issuer}`}{a.year && ` (${a.year})`}</li>)}</ul> : <p className="text-sm text-muted-foreground">Not added yet</p>}
          </Section>
          <Section title="Availability" summary={`${avail.length} time slots`}>
            {avail.length ? <ul className="space-y-1 text-sm">{avail.map((a, i) => <li key={i}><strong>{a.day}</strong> · {a.time}</li>)}</ul> : <p className="text-sm text-muted-foreground">Not added yet</p>}
          </Section>
        </div>
      )}
    </section>
  );
}
