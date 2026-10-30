import { z } from "zod";
import { GraduationCap, BookOpen, type LucideIcon } from "lucide-react";

export type AppRole = "student" | "teacher";

export const roleMeta: Record<
  AppRole,
  {
    label: string;
    area: "/account/student" | "/account/teacher";
    authPath: "/auth/student" | "/auth/teacher";
    icon: LucideIcon;
    tone: string;
    blurb: string;
  }
> = {
  student: {
    label: "Student",
    area: "/account/student",
    authPath: "/auth/student",
    icon: GraduationCap,
    tone: "bg-mint",
    blurb: "Find tutors, explore learning materials and track your learning.",
  },
  teacher: {
    label: "Teacher",
    area: "/account/teacher",
    authPath: "/auth/teacher",
    icon: BookOpen,
    tone: "bg-peach",
    blurb: "Create your tutor listing and reach students across Malaysia.",
  },
};

export const otherRole = (role: AppRole): AppRole => (role === "student" ? "teacher" : "student");

export const emailSchema = z.string().trim().email("Enter a valid email address").max(255, "Email is too long");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long");
export const displayNameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long");

export const signUpSchema = z.object({ name: displayNameSchema, email: emailSchema, password: passwordSchema });
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") });

export const studentProfileSchema = z.object({
  name: displayNameSchema,
  educationLevel: z.string().trim().max(60, "Level is too long"),
});

export const teacherProfileSchema = z.object({
  qualification: z.string().trim().max(120, "Qualification is too long"),
  subjects: z.string().trim().max(200, "Subject list is too long"),
  teachingMode: z.enum(["", "Online", "In-person", "Online & In-person"]),
  location: z.string().trim().max(60, "Location is too long"),
  feePerHour: z.number().min(0, "Fee cannot be negative").max(10000, "Fee looks too high"),
  bio: z.string().trim().max(2000, "About section must be under 2000 characters"),
  tagline: z.string().trim().max(120, "Tagline must be under 120 characters"),
  years: z.number().int("Years must be a whole number").min(0, "Years cannot be negative").max(60, "Years looks too high"),
});

/** "Math, Physics , " -> ["Math", "Physics"]; capped at 10 entries. */
export function parseSubjects(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}
