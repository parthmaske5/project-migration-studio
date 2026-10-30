import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X, Sprout, LogOut, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/use-session";
import { getMyRoles, signOutEverywhere } from "@/lib/account-data";

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Find Tutors", href: "/tutors" },
  { label: "Learning Materials", href: "/#materials" },
  { label: "Freelancers", href: "/#freelancers" },
  { label: "Membership", href: "/#membership" },
  { label: "Become a Provider", href: "/#how-it-works" },
];

export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-foreground">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Sprout className="size-5" />
      </span>
      PUPUK<span className="hidden font-semibold text-primary sm:inline">Education</span>
    </a>
  );
}

function useAccountNav() {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const rolesQuery = useQuery({
    queryKey: ["roles", user?.id],
    queryFn: () => getMyRoles(user!.id),
    enabled: !!user,
  });
  const roles = rolesQuery.data ?? [];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOutEverywhere();
    navigate({ to: "/auth", replace: true });
  }

  return { user, loading, roles, signOut };
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading, roles, signOut } = useAccountNav();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href} className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {loading ? null : user ? (
            <>
              {roles.includes("student") && (
                <Button variant="ghost" className="rounded-full font-semibold" asChild>
                  <Link to="/account/student">
                    <GraduationCap /> Student area
                  </Link>
                </Button>
              )}
              {roles.includes("teacher") && (
                <Button variant="ghost" className="rounded-full font-semibold" asChild>
                  <Link to="/account/teacher">
                    <BookOpen /> Teacher dashboard
                  </Link>
                </Button>
              )}
              <Button variant="pill-outline" className="font-semibold" onClick={signOut}>
                <LogOut /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="rounded-full font-semibold" asChild>
                <Link to="/auth">Login</Link>
              </Button>
              <Button variant="pill" className="font-semibold" asChild>
                <Link to="/auth">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
        <button className="rounded-full p-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 pb-6 pt-2 lg:hidden">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-semibold hover:bg-secondary">
              {l.label}
            </a>
          ))}
          {!loading &&
            (user ? (
              <div className="mt-3 space-y-2">
                {roles.includes("student") && (
                  <Button variant="pill-outline" className="w-full" asChild>
                    <Link to="/account/student" onClick={() => setOpen(false)}>
                      <GraduationCap /> Student area
                    </Link>
                  </Button>
                )}
                {roles.includes("teacher") && (
                  <Button variant="pill-outline" className="w-full" asChild>
                    <Link to="/account/teacher" onClick={() => setOpen(false)}>
                      <BookOpen /> Teacher dashboard
                    </Link>
                  </Button>
                )}
                <Button variant="pill" className="w-full" onClick={signOut}>
                  <LogOut /> Sign out
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="pill-outline" asChild>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button variant="pill" asChild>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            ))}
        </div>
      )}
    </header>
  );
}
