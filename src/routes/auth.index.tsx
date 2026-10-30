import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { roleMeta, type AppRole } from "@/lib/account";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign In or Sign Up — PUPUK Education" },
      { name: "description", content: "Choose your account type: sign in or create an account as a student or a teacher on PUPUK Education." },
      { property: "og:title", content: "Sign In or Sign Up — PUPUK Education" },
      { property: "og:description", content: "One account, two roles: join PUPUK Education as a student, a teacher, or both." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthChooser,
});

function AuthChooser() {
  const { redirect } = Route.useSearch();
  return (
    <div className="w-full max-w-3xl">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Welcome to PUPUK</p>
        <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">How will you grow with us?</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          One account is enough — you can add the other role later with the same email.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {(Object.keys(roleMeta) as AppRole[]).map((role) => {
          const meta = roleMeta[role];
          return (
            <Link
              key={role}
              to={meta.authPath}
              search={redirect ? { redirect } : {}}
              className={`card-soft group block p-8 ${meta.tone}`}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-card text-primary shadow-soft">
                <meta.icon className="size-7" />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold">I'm a {meta.label}</h2>
              <p className="mt-2 text-foreground/75">{meta.blurb}</p>
              <span className="mt-5 inline-flex items-center gap-1 font-bold text-primary">
                Continue as {meta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
