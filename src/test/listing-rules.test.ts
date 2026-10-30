import { describe, expect, it } from "vitest";
import { listingState, missingRequired } from "@/lib/completeness";

const full = { display_name: "Aina", tagline: "Maths made simple", subjects: ["Maths"], qualification: "B.Ed", teaching_mode: "Online", location: "Selangor", fee_per_hour: 60, bio: "Hi" };

describe("tutor listing visibility", () => {
  it("a listing missing the bio is incomplete even if approved", () => {
    expect(listingState({ ...full, bio: "", status: "approved" })).toBe("incomplete");
  });
  it("a complete but unapproved listing is pending admin approval", () => {
    expect(listingState({ ...full, status: "pending" })).toBe("pending");
  });
  it("a complete approved listing is live", () => {
    expect(listingState({ ...full, status: "approved" })).toBe("live");
  });
  it("photo and experience are not required to go live", () => {
    expect(missingRequired(full)).toEqual([]);
  });
});
