import { describe, it, expect } from "vitest";
import { calculateCodeCounts, sortFigures } from "../filterUtils.js";
import { SORT_OPTIONS } from "../constants.js";

const figures = [
  { guid: "a", year: "2020", paperTitle: "Banana paper", codes: ["x.y.z"] },
  { guid: "b", year: "2022", paperTitle: "Apple paper", codes: ["x.y.z", "x.y.w"] },
  { guid: "c", year: null, paperTitle: "Cherry paper", codes: [] }
];

describe("calculateCodeCounts", () => {
  it("counts how many figures carry each code", () => {
    const counts = calculateCodeCounts(figures, ["x.y.z", "x.y.w", "unused.code"]);
    expect(counts.get("x.y.z")).toBe(2);
    expect(counts.get("x.y.w")).toBe(1);
    expect(counts.get("unused.code")).toBe(0);
  });
});

describe("sortFigures", () => {
  it("sorts newest publication first, with missing years last", () => {
    const sorted = sortFigures(figures, SORT_OPTIONS.NEWEST, false);
    expect(sorted.map((f) => f.guid)).toEqual(["b", "a", "c"]);
  });

  it("sorts oldest publication first, with missing years last", () => {
    const sorted = sortFigures(figures, SORT_OPTIONS.OLDEST, false);
    expect(sorted.map((f) => f.guid)).toEqual(["a", "b", "c"]);
  });

  it("sorts alphabetically by paper title", () => {
    const sorted = sortFigures(figures, SORT_OPTIONS.TITLE, false);
    expect(sorted.map((f) => f.guid)).toEqual(["b", "a", "c"]);
  });

  it("preserves incoming order for relevance when a search is active", () => {
    const searchOrder = [figures[2], figures[0], figures[1]];
    const sorted = sortFigures(searchOrder, SORT_OPTIONS.RELEVANCE, true);
    expect(sorted.map((f) => f.guid)).toEqual(["c", "a", "b"]);
  });

  it("falls back to code-count ordering for relevance with no active search", () => {
    const sorted = sortFigures(figures, SORT_OPTIONS.RELEVANCE, false);
    // "b" has 2 codes, "a" has 1, "c" has 0
    expect(sorted.map((f) => f.guid)).toEqual(["b", "a", "c"]);
  });
});
