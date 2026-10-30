import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseSubjects, studentProfileSchema, teacherProfileSchema, type AppRole } from "@/lib/account";
import { malaysianLocations, studentLevels } from "@/data/sample";
import type { Tables } from "@/integrations/supabase/types";
import { cleanAchievements, cleanAvailability, cleanQualifications } from "@/lib/tutor-data";

type Row = Record<string, string>;

function ListEditor({ label, rows, setRows, fields, addLabel }: {
  label: string; rows: Row[]; setRows: (r: Row[]) => void; fields: { key: string; placeholder: string }[]; addLabel: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`grid flex-1 gap-2 ${fields.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
              {fields.map((f) => (
                <input key={f.key} className={inputCls} placeholder={f.placeholder} aria-label={`${label} ${f.placeholder}`} value={r[f.key] ?? ""}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
              ))}
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
      </div>
      {rows.length < 10 && (
        <Button type="button" variant="pill-outline" size="sm" className="mt-2" onClick={() => setRows([...rows, {}])}><Plus /> {addLabel}</Button>
      )}
    </div>
  );
}

const toRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

type Props = {
  role: AppRole;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialName?: string;
  initialStudent?: Tables<"student_profiles"> | null;
  initialTeacher?: Tables<"teacher_profiles"> | null;
};

export function OnboardingDialog({ role, userId, open, onClose, onSaved, initialName, initialStudent, initialTeacher }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [educationLevel, setEducationLevel] = useState(initialStudent?.education_level ?? "");
  const [qualification, setQualification] = useState(initialTeacher?.qualification ?? "");
  const [subjects, setSubjects] = useState((initialTeacher?.subjects ?? []).join(", "));
  const [teachingMode, setTeachingMode] = useState(initialTeacher?.teaching_mode ?? "");
  const [location, setLocation] = useState(initialTeacher?.location ?? "");
  const [fee, setFee] = useState(initialTeacher?.fee_per_hour != null ? String(initialTeacher.fee_per_hour) : "");
  const [bio, setBio] = useState(initialTeacher?.bio ?? "");
  const [tagline, setTagline] = useState(initialTeacher?.tagline ?? "");
  const [years, setYears] = useState(initialTeacher?.years_experience != null ? String(initialTeacher.years_experience) : "");
  const [levels, setLevels] = useState<string[]>(initialTeacher?.levels ?? []);
  const [curricula, setCurricula] = useState((initialTeacher?.curricula ?? []).join(", "));
  const [languages, setLanguages] = useState((initialTeacher?.languages ?? []).join(", "));
  const [skills, setSkills] = useState((initialTeacher?.skills ?? []).join(", "));
  const [quals, setQuals] = useState<Row[]>(toRows(initialTeacher?.qualifications));
  const [achievements, setAchievements] = useState<Row[]>(toRows(initialTeacher?.achievements));
  const [availability, setAvailability] = useState<Row[]>(toRows(initialTeacher?.availability));
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (role === "student") {
        const parsed = studentProfileSchema.safeParse({ name, educationLevel });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check your details.");
        const { error: pErr } = await supabase.from("profiles").update({ display_name: parsed.data.name }).eq("id", userId);
        if (pErr) throw pErr;
        const { error: sErr } = await supabase
          .from("student_profiles")
          .update({ education_level: parsed.data.educationLevel || null, completed_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (sErr) throw sErr;
      } else {
        const parsed = teacherProfileSchema.safeParse({
          qualification,
          subjects,
          teachingMode,
          location,
          feePerHour: fee === "" ? 0 : Number(fee),
          bio,
          tagline,
          years: years === "" ? 0 : Number(years),
        });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check your details.");
        let photoPath: string | undefined;
        if (photo) {
          if (!photo.type.startsWith("image/")) throw new Error("Profile photo must be an image.");
          if (photo.size > 5 * 1024 * 1024) throw new Error("Profile photo must be under 5MB.");
          photoPath = `${userId}/photo-${Date.now()}.${photo.name.split(".").pop()?.toLowerCase() || "jpg"}`;
          const { error: upErr } = await supabase.storage.from("tutor-photos").upload(photoPath, photo, { contentType: photo.type });
          if (upErr) throw upErr;
        }
        const { error: tErr } = await supabase
          .from("teacher_profiles")
          .update({
            qualification: parsed.data.qualification || null,
            subjects: parseSubjects(parsed.data.subjects),
            teaching_mode: parsed.data.teachingMode || null,
            location: parsed.data.location || null,
            fee_per_hour: fee === "" ? null : parsed.data.feePerHour,
            bio: parsed.data.bio || null,
            tagline: parsed.data.tagline || null,
            years_experience: years === "" ? null : parsed.data.years,
            levels,
            curricula: parseSubjects(curricula),
            languages: parseSubjects(languages),
            skills: parseSubjects(skills),
            qualifications: cleanQualifications(quals),
            achievements: cleanAchievements(achievements),
            availability: cleanAvailability(availability),
            ...(photoPath ? { photo_url: photoPath } : {}),
            completed_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (tErr) throw tErr;
      }
      toast.success("Profile saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{role === "student" ? "Tell us about yourself" : "Set up your tutor listing"}</DialogTitle>
          <DialogDescription>
            {role === "student"
              ? "A couple of quick details help us personalise your experience. You can skip this and finish it later."
              : "This information becomes your tutor listing. New listings stay hidden until an admin approves them. You can skip and finish later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {role === "student" ? (
            <>
              <Field label="Display name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aina Rahman" />
              </Field>
              <Field label="Education level">
                <select className={inputCls} value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                  <option value="">Choose a level</option>
                  {studentLevels.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Profile photo">
                <span className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-2.5 text-sm font-semibold text-muted-foreground">
                  <Upload className="size-4" /> {photo ? photo.name : initialTeacher?.photo_url ? "Photo uploaded — choose a file to replace" : "Choose an image (max 5MB)"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                </span>
              </Field>
              <Field label="Tagline">
                <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Making Mathematics simpler, one concept at a time." />
              </Field>
              <Field label="Headline / main qualification">
                <input className={inputCls} value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. B.Ed. (Mathematics), UPSI" />
              </Field>
              <Field label="Subjects (comma separated)">
                <input className={inputCls} value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="e.g. Mathematics, Add Maths" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Teaching mode">
                  <select className={inputCls} value={teachingMode} onChange={(e) => setTeachingMode(e.target.value)}>
                    <option value="">Choose a mode</option>
                    <option>Online</option>
                    <option>In-person</option>
                    <option>Online & In-person</option>
                  </select>
                </Field>
                <Field label="Location">
                  <select className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)}>
                    <option value="">Choose a location</option>
                    {malaysianLocations.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hourly fee (RM)">
                  <input className={inputCls} type="number" min={0} step={5} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. 60" />
                </Field>
                <Field label="Years of experience">
                  <input className={inputCls} type="number" min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} placeholder="e.g. 8" />
                </Field>
              </div>
              <fieldset>
                <legend className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Levels you teach</legend>
                <div className="flex flex-wrap gap-2">
                  {studentLevels.map((l) => (
                    <label key={l} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold ${levels.includes(l) ? "border-primary bg-mint text-primary" : "border-border"}`}>
                      <input type="checkbox" className="sr-only" checked={levels.includes(l)} onChange={(e) => setLevels(e.target.checked ? [...levels, l] : levels.filter((x) => x !== l))} />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Curricula (comma separated)">
                <input className={inputCls} value={curricula} onChange={(e) => setCurricula(e.target.value)} placeholder="e.g. KSSM, IGCSE, IB" />
              </Field>
              <Field label="Languages spoken (comma separated)">
                <input className={inputCls} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g. English, Bahasa Melayu" />
              </Field>
              <Field label="Additional skillsets (comma separated)">
                <input className={inputCls} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Exam techniques, Public speaking" />
              </Field>
              <ListEditor label="Qualifications & education" rows={quals} setRows={setQuals} addLabel="Add qualification"
                fields={[{ key: "title", placeholder: "Qualification" }, { key: "institution", placeholder: "Institution" }, { key: "year", placeholder: "Year" }]} />
              <ListEditor label="Achievements & certificates" rows={achievements} setRows={setAchievements} addLabel="Add achievement"
                fields={[{ key: "title", placeholder: "Title" }, { key: "issuer", placeholder: "Issued by" }, { key: "year", placeholder: "Year" }, { key: "url", placeholder: "Certificate link (https://…)" }]} />
              <ListEditor label="Availability" rows={availability} setRows={setAvailability} addLabel="Add time slot"
                fields={[{ key: "day", placeholder: "Day, e.g. Saturday" }, { key: "time", placeholder: "Time, e.g. 9am – 12pm" }]} />
              <Field label="About you">
                <textarea className={`${inputCls} min-h-24 resize-y`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell students about your experience and teaching style." />
              </Field>
            </>
          )}
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive" role="alert">{error}</p>}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Skip for later
            </Button>
            <Button type="submit" variant="pill" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save my profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
