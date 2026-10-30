import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { TeachingMode, Tutor } from "@/data/sample";

export type Qualification = { title: string; institution?: string; year?: string };
export type Achievement = { title: string; issuer?: string; year?: string; url?: string };
export type AvailabilitySlot = { day: string; time: string };

export type TutorDetail = Tutor & {
  tagline: string;
  bio: string;
  curricula: string[];
  languages: string[];
  skills: string[];
  qualifications: Qualification[];
  achievements: Achievement[];
  availability: AvailabilitySlot[];
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Keep only well-formed list entries with a non-empty title. */
export function cleanQualifications(raw: unknown): Qualification[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const title = str(r?.title);
    if (!title) return [];
    const q: Qualification = { title };
    if (str(r?.institution)) q.institution = str(r.institution);
    if (str(r?.year)) q.year = str(r.year);
    return [q];
  });
}
export function cleanAchievements(raw: unknown): Achievement[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const title = str(r?.title);
    if (!title) return [];
    const a: Achievement = { title };
    if (str(r?.issuer)) a.issuer = str(r.issuer);
    if (str(r?.year)) a.year = str(r.year);
    if (/^https?:\/\//i.test(str(r?.url))) a.url = str(r.url);
    return [a];
  });
}
export function cleanAvailability(raw: unknown): AvailabilitySlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => (str(r?.day) && str(r?.time) ? [{ day: str(r.day), time: str(r.time) }] : []));
}

const modes: TeachingMode[] = ["Online", "In-person", "Online & In-person"];

/** Map a database listing + name to the shape the directory and profile page use. */
export function toTutorDetail(row: Tables<"teacher_profiles">, name: string, photo?: string): TutorDetail {
  const years = row.years_experience ?? 0;
  const t: TutorDetail = {
    id: row.id,
    name: name.trim() || "PUPUK tutor",
    qualification: row.qualification ?? "",
    subjects: row.subjects ?? [],
    experience: years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : "",
    years,
    mode: modes.includes(row.teaching_mode as TeachingMode) ? (row.teaching_mode as TeachingMode) : "",
    fee: row.fee_per_hour != null ? Number(row.fee_per_hour) : 0,
    location: row.location ?? "",
    levels: row.levels ?? [],
    tagline: row.tagline ?? "",
    bio: row.bio ?? "",
    curricula: row.curricula ?? [],
    languages: row.languages ?? [],
    skills: row.skills ?? [],
    qualifications: cleanQualifications(row.qualifications),
    achievements: cleanAchievements(row.achievements),
    availability: cleanAvailability(row.availability),
  };
  if (photo) t.photo = photo;
  return t;
}

async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from("tutor-photos").createSignedUrls(paths, 60 * 60 * 6);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

async function hydrate(rows: Tables<"teacher_profiles">[]): Promise<TutorDetail[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.user_id);
  const [{ data: names }, photos] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", ids),
    signPhotos(rows.map((r) => r.photo_url).filter((p): p is string => !!p)),
  ]);
  const nameById = new Map((names ?? []).map((n) => [n.id, n.display_name ?? ""]));
  return rows.map((r) => toTutorDetail(r, nameById.get(r.user_id) ?? "", r.photo_url ? photos[r.photo_url] : undefined));
}

/** All approved tutor listings (RLS only exposes approved rows publicly). */
export async function fetchApprovedTutors(): Promise<TutorDetail[]> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("*")
    .eq("status", "approved")
    .not("completed_at", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return hydrate(data ?? []);
}

export async function fetchTutor(id: string): Promise<TutorDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("teacher_profiles").select("*").eq("id", id).eq("status", "approved").not("completed_at", "is", null).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await hydrate([data]))[0] ?? null;
}

/** Tutors sharing a subject first, then others; excludes the current tutor. */
export function relatedTutors(all: Tutor[], current: Tutor, limit = 3): Tutor[] {
  const others = all.filter((t) => t.id !== current.id);
  const score = (t: Tutor) => t.subjects.filter((s) => current.subjects.includes(s)).length;
  return [...others].sort((a, b) => score(b) - score(a)).slice(0, limit);
}
