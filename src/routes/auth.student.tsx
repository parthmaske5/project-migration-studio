import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/site/AuthForm";

export const Route = createFileRoute("/auth/student")({
  head: () => ({
    meta: [
      { title: "Student Sign In — PUPUK Education" },
      { name: "description", content: "Sign in or create a student account on PUPUK Education to find tutors and learning materials." },
      { property: "og:title", content: "Student Sign In — PUPUK Education" },
      { property: "og:description", content: "Sign in or create a student account on PUPUK Education." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentAuthPage,
});

function StudentAuthPage() {
  return <AuthForm role="student" />;
}
