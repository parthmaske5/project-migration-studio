import { describe, expect, it } from "vitest";
import { cleanAchievements, cleanQualifications, relatedTutors, toTutorDetail } from "@/lib/tutor-data";
import { tutors } from "@/data/sample";
import { enquirySchema } from "@/components/site/EnquiryDialog";

const row = {
  id: "11111111-1111-1111-1111-111111111111", user_id: "u", status: "approved", qualification: null, subjects: ["Maths"],
  teaching_mode: null, location: null, fee_per_hour: null, bio: null, tagline: null, photo_url: null, years_experience: null,
  levels: [], curricula: [], languages: [], skills: [], qualifications: [{ title: "" }, { title: "B.Ed", year: "" }],
  achievements: [{ title: "Award", url: "javascript:alert(1)" }], availability: [{ day: "Mon" }],
  completed_at: null, created_at: "", updated_at: "",
};

describe("tutor profile data", () => {
  it("leaves missing fields empty instead of placeholders", () => {
    const t = toTutorDetail(row, "Aina");
    expect(t.experience).toBe("");
    expect(t.mode).toBe("");
    expect(t.fee).toBe(0);
    expect(t.availability).toEqual([]);
  });
  it("drops untitled qualifications and blank parts", () => {
    expect(cleanQualifications(row.qualifications)).toEqual([{ title: "B.Ed" }]);
  });
  it("only keeps http(s) certificate links", () => {
    expect(cleanAchievements(row.achievements)).toEqual([{ title: "Award" }]);
  });
  it("related tutors exclude the current tutor", () => {
    const r = relatedTutors(tutors, tutors[0]!);
    expect(r.map((t) => t.id)).not.toContain(tutors[0]!.id);
  });
  it("enquiry requires level and subject but not message", () => {
    expect(enquirySchema.safeParse({ level: "", subject: "Maths", message: "" }).success).toBe(false);
    expect(enquirySchema.safeParse({ level: "Primary", subject: "", message: "" }).success).toBe(false);
    expect(enquirySchema.safeParse({ level: "Primary", subject: "Maths", message: "" }).success).toBe(true);
  });
});
