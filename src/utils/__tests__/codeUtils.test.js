import { describe, it, expect } from "vitest";
import { getContextualLabel, groupDisplayCodes, formatCodeLabel } from "../codeUtils.js";

describe("getContextualLabel", () => {
  it("replaces ambiguous 'None' values with contextual labels", () => {
    expect(getContextualLabel("Communicative/Contextualization", "None")).toBe("No contextualization");
    expect(getContextualLabel("Comparative Design", "None")).toBe("No comparative design");
    expect(getContextualLabel("Scalability Strategy", "None")).toBe("No scalability strategy");
  });

  it("keeps a suffix like '(Item-level)' attached to the contextual label", () => {
    expect(getContextualLabel("Scalability Strategy", "None (Item-level)")).toBe(
      "No scalability strategy (Item-level)"
    );
  });

  it("falls back to a generic 'No <category>' phrasing for unmapped categories", () => {
    expect(getContextualLabel("Some New Category", "None")).toBe("No some new category");
  });

  it("returns non-'None' values unchanged", () => {
    expect(getContextualLabel("Modality", "MERFISH")).toBe("MERFISH");
  });
});

describe("groupDisplayCodes", () => {
  it("separates single-level research-question codes from classification codes", () => {
    const { main, single } = groupDisplayCodes([
      "Data.Modality.MERFISH",
      "What genes are spatially variable?"
    ]);
    expect(single).toHaveLength(1);
    expect(single[0].text).toBe("What genes are spatially variable?");
    expect(main).toHaveLength(1);
    expect(main[0].text).toBe("Modality : MERFISH");
  });

  it("applies contextual 'None' labels within grouped codes", () => {
    const { main } = groupDisplayCodes(["Visualization.Comparative Design.None"]);
    expect(main[0].text).toBe("Comparative Design : No comparative design");
  });

  it("filters out hidden internal codes", () => {
    const { main, single } = groupDisplayCodes(["subset.interactivity", "spatial use.abstract"]);
    expect(main).toHaveLength(0);
    expect(single).toHaveLength(0);
  });
});

describe("formatCodeLabel", () => {
  it("formats a single raw code into a short chip label", () => {
    expect(formatCodeLabel("Visualization.Scalability Strategy.None (Item-level)")).toBe(
      "Scalability Strategy : No scalability strategy (Item-level)"
    );
  });
});
