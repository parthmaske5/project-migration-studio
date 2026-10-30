import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Briefcase, Check, GraduationCap, MapPin, Clock, Quote, Search, UserPlus, MessageCircle, Sparkles } from "lucide-react";
import heroAsset from "@/assets/hero.jpg.asset.json";
const heroImg = heroAsset.url;
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Section } from "@/components/site/Section";
import { HeroSearch } from "@/components/site/HeroSearch";
import { featuredTutors as tutors, materials, services, faqs } from "@/data/sample";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PUPUK Education — Tutors, Learning Materials & Freelancers" },
      { name: "description", content: "Discover great tutors, explore learning resources and connect with talented professionals — all in one place." },
      { property: "og:title", content: "PUPUK Education — Grow Your Potential" },
      { property: "og:description", content: "Find tutors, learning materials and education freelancers in one friendly marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Card({ to, className, children }: { to: string; className: string; children: ReactNode }) {
  if (to === "tutors") return <Link to="/tutors" className={className}>{children}</Link>;
  return <button onClick={() => scrollTo(to)} className={className}>{children}</button>;
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Index() {
  return (
    <div id="top" className="min-h-screen">
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="bg-hero">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-bold text-primary shadow-soft">
                <Sparkles className="size-4" /> Malaysia's friendly education marketplace
              </span>
              <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] md:text-6xl xl:text-7xl">
                Grow Your Potential. <span className="text-primary">Find Your Way.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Discover great tutors, explore learning resources and connect with talented professionals – all in one place.
              </p>
              <div className="mt-8"><HeroSearch /></div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="pill" size="xl" onClick={() => scrollTo("marketplace")}>Explore Now <ArrowRight /></Button>
                <Button variant="pill-outline" size="xl" onClick={() => scrollTo("how-it-works")}>Become a Provider</Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-4 -top-4 h-full w-full rounded-[2.5rem] bg-peach" />
              <img src={heroImg} alt="Student learning with a tutor" width={1200} height={1200} className="relative aspect-square w-full rounded-[2.5rem] object-cover shadow-lift" />
              <div className="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-lift">
                <span className="grid size-10 place-items-center rounded-xl bg-mint text-primary"><GraduationCap className="size-5" /></span>
                <div className="text-sm"><p className="font-bold">Tutors · Materials · Freelancers</p><p className="text-muted-foreground">One place to learn and grow</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* MARKETPLACE */}
        <Section id="marketplace" eyebrow="The marketplace" title="Everything you need to keep growing">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: GraduationCap, tone: "bg-mint", title: "Find Your Perfect Tutor.", text: "Qualified tutors for every subject and level, online or in-person.", to: "tutors" },
              { icon: BookOpen, tone: "bg-sky", title: "Learning Made Accessible.", text: "Worksheets, notes and revision packs made by real educators.", to: "materials" },
              { icon: Briefcase, tone: "bg-peach", title: "Skills Meet Opportunities.", text: "Hire freelancers for design, editing, translation and more.", to: "freelancers" },
            ].map((c) => (
              <Card key={c.title} to={c.to} className={`card-soft group block p-8 text-left ${c.tone}`}>
                <span className="grid size-14 place-items-center rounded-2xl bg-card text-primary shadow-soft"><c.icon className="size-7" /></span>
                <h3 className="mt-6 text-2xl font-extrabold">{c.title}</h3>
                <p className="mt-2 text-foreground/75">{c.text}</p>
                <span className="mt-6 inline-flex items-center gap-1 font-bold text-primary">Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </Card>
            ))}
          </div>
        </Section>

        {/* TUTORS */}
        <Section id="tutors" eyebrow="Featured tutors" title="Learn from passionate educators" action={<Button variant="pill-outline" asChild><Link to="/tutors">View all tutors</Link></Button>}>
          <div className="grid gap-6 md:grid-cols-3">
            {tutors.map((t) => (
              <article key={t.name} className="card-soft overflow-hidden">
                <img src={t.photo} alt={t.name} loading="lazy" width={816} height={816} className="aspect-[4/3] w-full object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-extrabold">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.qualification}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.subjects.map((s) => <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{s}</span>)}
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><Clock className="size-4" /> {t.experience} experience</p>
                    <p className="flex items-center gap-2"><MapPin className="size-4" /> {t.mode}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <p><span className="font-display text-2xl font-extrabold">RM{t.fee}</span><span className="text-sm text-muted-foreground">/hour</span></p>
                    <Button variant="pill" asChild><Link to="/tutors">View Profile</Link></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* MATERIALS */}
        <Section id="materials" eyebrow="Learning materials" title="Resources made by educators" action={<Button variant="pill-outline">Browse materials</Button>}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {materials.map((m) => (
              <article key={m.title} className="card-soft overflow-hidden">
                <div className={`grid aspect-[4/3] place-items-center text-6xl ${m.tone}`} aria-hidden>{m.emoji}</div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">{m.subject} · {m.grade}</p>
                  <h3 className="mt-1 text-lg font-extrabold leading-snug">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">by {m.creator}</p>
                  <p className="mt-4 font-display text-xl font-extrabold">RM{m.price}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* FREELANCERS */}
        <Section id="freelancers" eyebrow="Freelancer services" title="Talented help for educators and learners" action={<Button variant="pill-outline">See all services</Button>}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <article key={s.title} className="card-soft overflow-hidden">
                <div className={`grid aspect-video place-items-center text-5xl ${s.tone}`} aria-hidden>{s.emoji}</div>
                <div className="p-5">
                  <p className="text-sm font-bold text-primary">{s.freelancer}</p>
                  <h3 className="mt-1 text-lg font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                  <p className="mt-4 text-sm text-muted-foreground">Starting from <span className="font-display text-lg font-extrabold text-foreground">RM{s.from}</span></p>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* HOW IT WORKS */}
        <Section id="how-it-works" eyebrow="How it works" title="Simple for learners. Rewarding for providers.">
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { title: "For students & parents", tone: "bg-mint", steps: [
                { icon: Search, t: "Search", d: "Find tutors, materials or freelancers by subject, level or skill." },
                { icon: Check, t: "Compare", d: "Review qualifications, experience, teaching mode and prices." },
                { icon: MessageCircle, t: "Connect", d: "Contact your provider, book lessons or download resources." },
              ]},
              { title: "For tutors, creators & freelancers", tone: "bg-peach", steps: [
                { icon: UserPlus, t: "Sign up", d: "Create your account and choose your provider type." },
                { icon: GraduationCap, t: "Build your profile", d: "Add qualifications, services, materials and your rates." },
                { icon: Sparkles, t: "Get discovered", d: "Reach students and parents looking for what you offer." },
              ]},
            ].map((col) => (
              <div key={col.title} className={`rounded-[2rem] p-8 ${col.tone}`}>
                <h3 className="text-2xl font-extrabold">{col.title}</h3>
                <ol className="mt-6 space-y-4">
                  {col.steps.map((s, i) => (
                    <li key={s.t} className="flex gap-4 rounded-2xl bg-card p-4 shadow-soft">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><s.icon className="size-5" /></span>
                      <div><p className="font-bold">{i + 1}. {s.t}</p><p className="text-sm text-muted-foreground">{s.d}</p></div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center"><Button variant="pill" size="xl">Become a Provider <ArrowRight /></Button></div>
        </Section>

        {/* MEMBERSHIP */}
        <section id="membership" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 rounded-[2.5rem] bg-primary p-8 text-primary-foreground md:grid-cols-[1.3fr_1fr] md:p-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest opacity-80">Learning Materials Membership</p>
              <h2 className="mt-3 text-4xl font-extrabold md:text-5xl">Unlimited access to eligible resources.</h2>
              <p className="mt-4 text-lg opacity-85">One simple monthly plan covers every learning material marked <strong>“Membership eligible”</strong>. Individually priced premium items not marked eligible are sold separately.</p>
              <ul className="mt-6 space-y-2">
                {["Download all eligible worksheets & notes", "New eligible resources added regularly", "Cancel anytime"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-5" /> {f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-card p-8 text-center text-card-foreground shadow-lift">
              <p className="font-bold text-muted-foreground">Monthly plan</p>
              <p className="mt-2 font-display text-6xl font-extrabold">RM20<span className="text-xl text-muted-foreground">/month</span></p>
              <p className="mt-2 text-sm text-muted-foreground">Covers eligible resources only</p>
              <Button variant="pill" size="xl" className="mt-6 w-full">Join Membership</Button>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <Section eyebrow="Testimonials" title="What our community could say" intro="Sample testimonials shown for illustration only — not real reviews.">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { tone: "bg-sky", name: "Sample Parent", role: "Parent of a Form 3 student", text: "Finding a tutor who fits our schedule and budget was quick and stress-free." },
              { tone: "bg-butter", name: "Sample Student", role: "SPM candidate", text: "The revision notes were organised exactly by topic, which made studying much easier." },
              { tone: "bg-rose", name: "Sample Tutor", role: "Mathematics tutor", text: "Setting up my profile was simple, and I could clearly present my experience and rates." },
            ].map((t) => (
              <figure key={t.role} className={`card-soft relative p-8 ${t.tone}`}>
                <span className="absolute right-5 top-5 rounded-full bg-card px-3 py-1 text-xs font-bold text-muted-foreground">Sample content</span>
                <Quote className="size-9 text-primary" />
                <blockquote className="mt-4 text-lg font-semibold">“{t.text}”</blockquote>
                <figcaption className="mt-6"><p className="font-bold">{t.name}</p><p className="text-sm text-foreground/70">{t.role}</p></figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" eyebrow="FAQ" title="Questions, answered">
          <Accordion type="single" collapsible className="mx-auto max-w-3xl space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`f${i}`} className="rounded-2xl border-none bg-card px-6 shadow-soft">
                <AccordionTrigger className="text-left text-base font-bold hover:no-underline">
                  <span><span className="mr-3 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{f.group}</span>{f.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
