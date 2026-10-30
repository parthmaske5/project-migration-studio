import { Link } from "@tanstack/react-router";
import { Clock, GraduationCap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tutor } from "@/data/sample";

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
}

/** Directory card for a live tutor; hides any field the tutor hasn't filled in. */
export function TutorCard({ tutor: t }: { tutor: Tutor }) {
  const where = [t.location, t.mode].filter(Boolean).join(" · ");
  return (
    <article className="card-soft relative flex flex-col overflow-hidden">
      {t.photo ? (
        <img src={t.photo} alt={t.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="grid aspect-[4/3] place-items-center bg-mint font-display text-5xl font-extrabold text-primary" aria-hidden>
          {initials(t.name)}
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-extrabold">{t.name}</h3>
        {t.qualification && <p className="text-sm text-muted-foreground">{t.qualification}</p>}
        {t.subjects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {t.subjects.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{s}</span>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {t.experience && <p className="flex items-center gap-2"><Clock className="size-4" /> {t.experience} experience</p>}
          {where && <p className="flex items-center gap-2"><MapPin className="size-4" /> {where}</p>}
          {t.levels.length > 0 && <p className="flex items-center gap-2"><GraduationCap className="size-4" /> {t.levels.join(", ")}</p>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          {t.fee > 0 ? (
            <p><span className="font-display text-2xl font-extrabold">RM{t.fee}</span><span className="text-sm text-muted-foreground">/hour</span></p>
          ) : <span />}
          <Button variant="pill" asChild>
            <Link to="/tutors/$id" params={{ id: t.id }}>View profile</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
