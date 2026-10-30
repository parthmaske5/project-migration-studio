import { describe, expect, it } from "vitest";
import { otherRole, parseSubjects, roleMeta, signInSchema, signUpSchema, teacherProfileSchema } from "@/lib/account";

describe("role model", () => {
  it("student and teacher have distinct areas and auth pages", () => {
    expect(roleMeta.student.area).toBe("/account/student");
    expect(roleMeta.teacher.area).toBe("/account/teacher");
    expect(roleMeta.student.authPath).not.toBe(roleMeta.teacher.authPath);
  });

  it("otherRole flips between the two roles", () => {
    expect(otherRole("student")).toBe("teacher");
    expect(otherRole("teacher")).toBe("student");
  });
});

describe("auth validation", () => {
  it("rejects sign-up passwords under 8 characters", () => {
    expect(signUpSchema.safeParse({ name: "Aina", email: "aina@example.com", password: "short" }).success).toBe(false);
  });

  it("rejects invalid emails", () => {
    expect(signInSchema.safeParse({ email: "not-an-email", password: "whatever1" }).success).toBe(false);
  });

  it("accepts a valid sign-up", () => {
    expect(signUpSchema.safeParse({ name: "Aina Rahman", email: "aina@example.com", password: "password8" }).success).toBe(true);
  });
});

describe("teacher listing validation", () => {
  it("rejects negative hourly fees", () => {
    const result = teacherProfileSchema.safeParse({
      qualification: "B.Ed",
      subjects: "Maths",
      teachingMode: "Online",
      location: "Selangor",
      feePerHour: -5,
      bio: "",
      tagline: "",
      years: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseSubjects", () => {
  it("trims, drops empties and caps at 10", () => {
    expect(parseSubjects("Maths, Physics ,, Chemistry")).toEqual(["Maths", "Physics", "Chemistry"]);
    expect(parseSubjects("a,b,c,d,e,f,g,h,i,j,k,l")).toHaveLength(10);
    expect(parseSubjects("")).toEqual([]);
  });
});
