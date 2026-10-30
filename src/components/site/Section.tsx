import type { ReactNode } from "react";

export function Section({ id, eyebrow, title, intro, action, children, className = "" }: {
  id?: string; eyebrow?: string; title: string; intro?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-20 ${className}`}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow && <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
          <h2 className="text-3xl font-extrabold md:text-4xl">{title}</h2>
          {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
