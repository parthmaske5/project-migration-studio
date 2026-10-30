import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RotateCcw, Search, SearchX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TutorCard } from "@/components/site/TutorCard";
import { malaysianLocations, studentLevels } from "@/data/sample";
import { defaultFilters, filterTutors, type TutorFilters } from "@/lib/tutor-filters";
import { fetchApprovedTutors } from "@/lib/tutor-data";

const URL = "https://screenshot-to-screen-60.lovable.app/tutors";

export const tutorsQuery = queryOptions({ queryKey: ["approved-tutors"], queryFn: fetchApprovedTutors });

export const Route = createFileRoute("/tutors/")({
  head: () => ({
    meta: [
      { title: "Find Tutors — PUPUK Education" },
      { name: "description", content: "Browse tutors across Malaysia by subject, location, level, teaching mode and hourly fee." },
      { property: "og:title", content: "Find Tutors — PUPUK Education" },
      { property: "og:description", content: "Search and filter tutors by subject, location, level and price." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s.q === "string" && s.q.trim() ? { q: s.q.slice(0, 100) } : {}),
  loader: ({ context }) => context.queryClient.ensureQueryData(tutorsQuery),
  component: TutorsPage,
  errorComponent: TutorsError,
  notFoundComponent: () => <div className="p-10 text-center">No tutors found.</div>,
});

function TutorsError() {
  const router = useRouter();
  return (
    <div className="min-h-screen"><SiteHeader />
      <div className="card-soft mx-auto my-16 max-w-md p-8 text-center" role="alert">
        <h1 className="text-xl font-extrabold">We couldn't load tutors right now</h1>
        <Button variant="pill" className="mt-5" onClick={() => router.invalidate()}>Try again</Button>
      </div>
    </div>
  );
}

const selectCls = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}

function TutorsPage() {
  const { data: tutors } = useSuspenseQuery(tutorsQuery);
  const { q: urlQ } = Route.useSearch();
  const navigate = useNavigate({ from: "/tutors/" });
  const [f, setF] = useState<TutorFilters>(() => ({ ...defaultFilters, q: urlQ ?? "" }));
  useEffect(() => { setF((p) => (p.q === (urlQ ?? "") ? p : { ...p, q: urlQ ?? "" })); }, [urlQ]);
  useEffect(() => {
    const next = f.q.trim() || undefined;
    if (next !== urlQ) navigate({ search: next ? { q: next } : {}, replace: true });
  }, [f.q]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof TutorFilters>(k: K, v: TutorFilters[K]) => setF((p) => ({ ...p, [k]: v }));
  const results = useMemo(() => filterTutors(tutors, f), [tutors, f]);
  const subjects = useMemo(() => Array.from(new Set(tutors.flatMap((t) => t.subjects))).sort(), [tutors]);
  const levels = useMemo(() => Array.from(new Set([...studentLevels, ...tutors.flatMap((t) => t.levels)])), [tutors]);
  const dirty = JSON.stringify(f) !== JSON.stringify(defaultFilters);
  const reset = () => setF(defaultFilters);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="bg-hero">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Find Tutors</p>
            <h1 className="text-4xl font-extrabold md:text-5xl">Find a tutor who fits how you learn</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Search by subject, then narrow down by location, teaching mode, student level and hourly fee.</p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-card p-2 pl-5 shadow-lift">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search a subject or tutor name, e.g. Physics" aria-label="Search tutors"
                className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted-foreground" />
              <Button type="submit" variant="pill" size="xl">Search</Button>
            </form>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr]">
          <aside className="card-soft h-fit space-y-4 p-6 lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Filters</h2>
              <button onClick={reset} disabled={!dirty} className="inline-flex items-center gap-1 text-sm font-bold text-primary disabled:opacity-40"><RotateCcw className="size-4" /> Reset</button>
            </div>
            <Field label="Subject">
              <select className={selectCls} value={f.subject} onChange={(e) => set("subject", e.target.value)}>
                <option value="">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <select className={selectCls} value={f.location} onChange={(e) => set("location", e.target.value)}>
                <option value="">Anywhere in Malaysia</option>{malaysianLocations.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Availability">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1" role="radiogroup">
                {([["any", "Any"], ["online", "Online"], ["in-person", "In-person"]] as const).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={f.mode === v} onClick={() => set("mode", v)}
                    className={`rounded-lg px-2 py-2 text-xs font-bold ${f.mode === v ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>{l}</button>
                ))}
              </div>
            </Field>
            <Field label="Student level">
              <select className={selectCls} value={f.level} onChange={(e) => set("level", e.target.value)}>
                <option value="">All levels</option>{levels.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label={`Hourly fee (RM${f.minFee} – RM${f.maxFee})`}>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} step={5} aria-label="Minimum fee" className={selectCls} value={f.minFee} onChange={(e) => set("minFee", Number(e.target.value) || 0)} />
                <input type="number" min={0} step={5} aria-label="Maximum fee" className={selectCls} value={f.maxFee} onChange={(e) => set("maxFee", Number(e.target.value) || 0)} />
              </div>
            </Field>
          </aside>

          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold" aria-live="polite">{results.length} {results.length === 1 ? "tutor" : "tutors"} found</p>
              <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-muted-foreground">Sort by
                <select className={`${selectCls} w-auto`} value={f.sort} onChange={(e) => set("sort", e.target.value as TutorFilters["sort"])}>
                  <option value="recommended">Recommended</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="experience">Most experience</option>
                </select>
              </label>
            </div>

            {tutors.length === 0 ? (
              <div className="card-soft p-10 text-center">
                <Users className="mx-auto size-10 text-primary" />
                <h3 className="mt-4 text-xl font-extrabold">No approved tutors yet</h3>
                <p className="mt-2 text-muted-foreground">Tutor listings appear here once they've been reviewed and approved. Check back soon!</p>
              </div>
            ) : results.length === 0 ? (
              <div className="card-soft p-10 text-center">
                <SearchX className="mx-auto size-10 text-primary" />
                <h3 className="mt-4 text-xl font-extrabold">No tutors match those filters</h3>
                <p className="mt-2 text-muted-foreground">Try a different subject, widen the fee range or switch availability to “Any”.</p>
                <Button variant="pill" className="mt-6" onClick={reset}><RotateCcw /> Reset filters</Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((t) => <TutorCard key={t.id} tutor={t} />)}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
