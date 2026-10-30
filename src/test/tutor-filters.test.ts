import { describe, expect, it } from "vitest";
import { tutors } from "@/data/sample";
import { defaultFilters, filterTutors } from "@/lib/tutor-filters";

describe("filterTutors", () => {
  it("combines search with mode filter", () => {
    const r = filterTutors(tutors, { ...defaultFilters, q: "physics", mode: "online" });
    expect(r).toHaveLength(0);
    expect(filterTutors(tutors, { ...defaultFilters, q: "physics", mode: "in-person" }).map((t) => t.id)).toEqual(["daniel-tan"]);
  });
  it("hybrid tutors count as online and in-person", () => {
    expect(filterTutors(tutors, { ...defaultFilters, mode: "online" }).map((t) => t.id)).toContain("nur-aisyah");
  });
  it("applies price range", () => {
    expect(filterTutors(tutors, { ...defaultFilters, maxFee: 50 }).every((t) => t.fee <= 50)).toBe(true);
  });
  it("sorts by price low to high and experience", () => {
    const p = filterTutors(tutors, { ...defaultFilters, sort: "price-asc" }).map((t) => t.fee);
    expect(p).toEqual([...p].sort((a, b) => a - b));
    expect(filterTutors(tutors, { ...defaultFilters, sort: "experience" })[0]?.id).toBe("daniel-tan");
  });
});
