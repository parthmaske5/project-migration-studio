type Listing = {
  display_name?: string | null;
  photo_url?: string | null;
  tagline?: string | null;
  qualification?: string | null;
  subjects?: string[] | null;
  teaching_mode?: string | null;
  location?: string | null;
  fee_per_hour?: number | null;
  bio?: string | null;
  years_experience?: number | null;
  availability?: unknown;
};

const checks: [string, (l: Listing) => boolean][] = [
  ["name", (l) => !!l.display_name?.trim()],
  ["photo", (l) => !!l.photo_url],
  ["tagline", (l) => !!l.tagline?.trim()],
  ["qualification", (l) => !!l.qualification?.trim()],
  ["subjects", (l) => (l.subjects?.length ?? 0) > 0],
  ["teaching mode", (l) => !!l.teaching_mode],
  ["location", (l) => !!l.location],
  ["hourly fee", (l) => l.fee_per_hour != null],
  ["about me", (l) => !!l.bio?.trim()],
  ["experience", (l) => l.years_experience != null],
  ["availability", (l) => Array.isArray(l.availability) && l.availability.length > 0],
];

/** Share of listing fields filled in, plus the names of what's missing. */
export function profileCompleteness(l: Listing) {
  const missing = checks.filter(([, ok]) => !ok(l)).map(([n]) => n);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

/** Fields a tutor must fill before the listing can appear publicly (mirrors the database rule). */
const required: [string, (l: Listing) => boolean][] = [
  ["name", (l) => !!l.display_name?.trim()],
  ["tagline", (l) => !!l.tagline?.trim()],
  ["subjects", (l) => (l.subjects?.length ?? 0) > 0],
  ["qualification", (l) => !!l.qualification?.trim()],
  ["teaching mode", (l) => !!l.teaching_mode],
  ["location", (l) => !!l.location],
  ["hourly fee", (l) => l.fee_per_hour != null],
  ["about me", (l) => !!l.bio?.trim()],
];
export function missingRequired(l: Listing): string[] {
  return required.filter(([, ok]) => !ok(l)).map(([n]) => n);
}

export type ListingState = "incomplete" | "pending" | "rejected" | "live";
export function listingState(l: Listing & { status?: string | null }): ListingState {
  if (missingRequired(l).length > 0) return "incomplete";
  if (l.status === "approved") return "live";
  if (l.status === "rejected") return "rejected";
  return "pending";
}
