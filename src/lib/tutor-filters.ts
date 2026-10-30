import type { Tutor } from "@/data/sample";

export type TutorFilters = {
  q: string; subject: string; location: string; mode: "any" | "online" | "in-person";
  level: string; minFee: number; maxFee: number; sort: "recommended" | "price-asc" | "experience";
};

export const defaultFilters: TutorFilters = { q: "", subject: "", location: "", mode: "any", level: "", minFee: 0, maxFee: 200, sort: "recommended" };

export function filterTutors(list: Tutor[], f: TutorFilters): Tutor[] {
  const q = f.q.trim().toLowerCase();
  const out = list.filter((t) => {
    if (q && ![t.name, t.qualification, ...t.subjects].some((s) => s.toLowerCase().includes(q))) return false;
    if (f.subject && !t.subjects.includes(f.subject)) return false;
    if (f.location && t.location !== f.location) return false;
    if (f.mode === "online" && !t.mode.includes("Online")) return false;
    if (f.mode === "in-person" && !t.mode.includes("In-person")) return false;
    if (f.level && !t.levels.includes(f.level)) return false;
    return t.fee >= f.minFee && t.fee <= f.maxFee;
  });
  if (f.sort === "price-asc") out.sort((a, b) => a.fee - b.fee);
  if (f.sort === "experience") out.sort((a, b) => b.years - a.years);
  return out;
}
