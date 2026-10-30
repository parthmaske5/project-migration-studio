import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" && r.startsWith("/") ? { redirect: r } : {};
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="bg-hero flex flex-1 items-start justify-center px-4 py-12 sm:px-6 md:py-16">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
