import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Award, BookOpen, CalendarDays, Clock, ExternalLink, GraduationCap, Languages, Library, MapPin, MessageCircle, Monitor, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TutorCard, initials } from "@/components/site/TutorCard";
import { EnquiryDialog } from "@/components/site/EnquiryDialog";
import { fetchApprovedTutors, fetchTutor, relatedTutors, type TutorDetail } from "@/lib/tutor-data";

const tutorQuery = (id: string) => queryOptions({ queryKey: ["tutor", id], queryFn: () => fetchTutor(id) });

export const Route = createFileRoute("/tutors/$id")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(tutorQuery(params.id));
    if (!t) throw notFound();
    return { name: t.name, summary: [t.qualification, t.subjects.join(", ")].filter(Boolean).join(" · ") };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Tutor on PUPUK Education` : "Tutor profile — PUPUK Education";
    const desc = loaderData?.summary || "View this tutor's subjects, qualifications and availability on PUPUK Education.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: TutorProfilePage,
  errorComponent: ProfileError,
  notFoundComponent: () => (
    <Shell>
      <div className="card-soft mx-auto my-16 max-w-md p-8 text-center">
        <h1 className="text-xl font-extrabold">This tutor profile isn't available</h1>
        <p className="mt-2 text-muted-foreground">It may not be approved yet or no longer exists.</p>
        <Button variant="pill" className="mt-5" asChild><Link to="/tutors">Browse tutors</Link></Button>
      </div>
    </Shell>
  ),
});

function Shell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1">{children}</main><SiteFooter /></div>;
}

function ProfileError() {
  const router = useRouter();
  return (
    <Shell>
      <div className="card-soft mx-auto my-16 max-w-md p-8 text-center" role="alert">
        <h1 className="text-xl font-extrabold">We couldn't load this profile</h1>
        <Button variant="pill" className="mt-5" onClick={() => router.invalidate()}>Try again</Button>
      </div>
    </Shell>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="card-soft p-6 md:p-7">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold"><span className="text-primary">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}

function Chips({ items, tone = "bg-secondary text-secondary-foreground" }: { items: string[]; tone?: string }) {
  return <div className="flex flex-wrap gap-1.5">{items.map((s) => <span key={s} className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{s}</span>)}</div>;
}

function ProfileHeader({ t }: { t: TutorDetail }) {
  const facts = [
    t.experience && { icon: <Clock className="size-4" />, text: `${t.experience} teaching` },
    t.mode && { icon: <Monitor className="size-4" />, text: t.mode === "Online & In-person" ? "Online + In-person" : t.mode },
    t.location && { icon: <MapPin className="size-4" />, text: t.location },
    t.fee > 0 && { icon: <Wallet className="size-4" />, text: `RM${t.fee}/hour` },
  ].filter(Boolean) as { icon: ReactNode; text: string }[];
  return (
    <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
      {t.photo ? (
        <img src={t.photo} alt={t.name} className="size-32 shrink-0 rounded-3xl object-cover shadow-lift md:size-40" />
      ) : (
        <div className="grid size-32 shrink-0 place-items-center rounded-3xl bg-mint font-display text-5xl font-extrabold text-primary shadow-lift md:size-40" aria-hidden>{initials(t.name)}</div>
      )}
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold md:text-4xl">{t.name}</h1>
        {t.qualification && <p className="mt-1 text-lg font-semibold text-muted-foreground">{t.qualification}</p>}
        {facts.length > 0 && (
          <ul className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {facts.map((f) => <li key={f.text} className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-bold shadow-soft">{f.icon}{f.text}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function About({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 360;
  const shown = long && !open ? `${text.slice(0, 360).trimEnd()}…` : text;
  return (
    <Card title="About the tutor" icon={<Sparkles className="size-5" />}>
      <div className="space-y-3 leading-relaxed text-muted-foreground">
        {shown.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {long && <button className="mt-3 text-sm font-bold text-primary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Read less" : "Read more"}</button>}
    </Card>
  );
}

function TutorProfilePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(tutorQuery(id));
  const t = data!;
  const all = useQuery({ queryKey: ["approved-tutors"], queryFn: fetchApprovedTutors });
  const related = all.data ? relatedTutors(all.data, t) : [];
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const glance = [
    t.levels.length > 0 && { label: "Levels covered", icon: <GraduationCap className="size-4" />, items: t.levels },
    t.curricula.length > 0 && { label: "Curricula", icon: <Library className="size-4" />, items: t.curricula },
    t.languages.length > 0 && { label: "Languages", icon: <Languages className="size-4" />, items: t.languages },
  ].filter(Boolean) as { label: string; icon: ReactNode; items: string[] }[];

  const connect = (
    <Button variant="pill" size="xl" className="w-full sm:w-auto" onClick={() => setEnquiryOpen(true)}>
      <MessageCircle /> Connect with Tutor
    </Button>
  );

  return (
    <Shell>
      <section className="bg-hero">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
          <ProfileHeader t={t} />
          {t.tagline && <p className="mt-6 border-l-4 border-primary pl-4 font-display text-lg italic text-foreground/80">“{t.tagline}”</p>}
          <div ref={ctaRef} className="mt-6">{connect}</div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 pb-28 sm:px-6 sm:pb-10">
        {glance.length > 0 && (
          <div className={`grid gap-4 ${glance.length > 1 ? "sm:grid-cols-2" : ""} ${glance.length > 2 ? "lg:grid-cols-3" : ""}`}>
            {glance.map((g) => (
              <div key={g.label} className="card-soft p-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.icon}{g.label}</p>
                <Chips items={g.items} tone="bg-mint text-primary" />
              </div>
            ))}
          </div>
        )}

        {t.bio && <About text={t.bio} />}

        {(t.subjects.length > 0 || t.skills.length > 0) && (
          <div className={`grid gap-6 ${t.subjects.length > 0 && t.skills.length > 0 ? "md:grid-cols-2" : ""}`}>
            {t.subjects.length > 0 && <Card title="Subjects taught" icon={<BookOpen className="size-5" />}><Chips items={t.subjects} /></Card>}
            {t.skills.length > 0 && <Card title="Additional skillsets" icon={<Sparkles className="size-5" />}><Chips items={t.skills} tone="bg-peach text-foreground" /></Card>}
          </div>
        )}

        {t.qualifications.length > 0 && (
          <Card title="Qualifications & education" icon={<GraduationCap className="size-5" />}>
            <ul className="space-y-3">
              {t.qualifications.map((q, i) => (
                <li key={i} className="rounded-2xl bg-secondary/60 px-4 py-3">
                  <p className="font-bold">{q.title}</p>
                  {(q.institution || q.year) && <p className="text-sm text-muted-foreground">{[q.institution, q.year].filter(Boolean).join(" · ")}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {t.achievements.length > 0 && (
          <Card title="Achievements & certificates" icon={<Award className="size-5" />}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {t.achievements.map((a, i) => (
                <li key={i} className="rounded-2xl border border-border p-4">
                  <p className="font-bold">{a.title}</p>
                  {(a.issuer || a.year) && <p className="text-sm text-muted-foreground">{[a.issuer, a.year].filter(Boolean).join(" · ")}</p>}
                  {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">View certificate <ExternalLink className="size-3.5" /></a>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {t.availability.length > 0 && (
          <Card title="Availability" icon={<CalendarDays className="size-5" />}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {t.availability.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-2.5 text-sm">
                  <span className="font-bold">{s.day}</span><span className="text-muted-foreground">{s.time}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {related.length > 0 && (
          <section className="pt-6">
            <h2 className="mb-5 text-2xl font-extrabold">Related tutors</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <TutorCard key={r.id} tutor={r} />)}</div>
          </section>
        )}
      </div>

      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur sm:hidden">{connect}</div>
      )}

      <EnquiryDialog open={enquiryOpen} onClose={() => setEnquiryOpen(false)} teacherProfileId={t.id} tutorName={t.name} subjects={t.subjects} levels={t.levels} />
    </Shell>
  );
}
