import { describe, expect, it } from "vitest";
import { isUnread, statusLabel } from "@/lib/enquiries";
import { profileCompleteness } from "@/lib/completeness";

describe("unread enquiries", () => {
  it("is unread for the tutor when the student wrote and the tutor never opened it", () => {
    expect(isUnread("teacher", "student", "2026-10-30T10:00:00Z", null)).toBe(true);
  });
  it("is read once opened after the last message", () => {
    expect(isUnread("student", "teacher", "2026-10-30T10:00:00Z", "2026-10-30T10:05:00Z")).toBe(false);
  });
  it("my own latest message never counts as unread for me", () => {
    expect(isUnread("teacher", "teacher", "2026-10-30T10:00:00Z", null)).toBe(false);
  });
});

describe("conversation status", () => {
  it("a fresh enquiry is 'New enquiry' for the tutor", () => {
    expect(statusLabel("teacher", "student", false)).toBe("New enquiry");
  });
  it("after the tutor replies the student sees 'Tutor replied'", () => {
    expect(statusLabel("student", "teacher", true)).toBe("Tutor replied");
  });
});

describe("profile completeness", () => {
  it("an empty listing is 0%", () => {
    expect(profileCompleteness({}).percent).toBe(0);
  });
  it("a fully filled listing is 100%", () => {
    expect(profileCompleteness({
      display_name: "A", photo_url: "x", tagline: "t", qualification: "q", subjects: ["Maths"], teaching_mode: "Online",
      location: "Selangor", fee_per_hour: 50, bio: "b", years_experience: 3, availability: [{ day: "Mon" }],
    }).percent).toBe(100);
  });
});
