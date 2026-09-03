/**
 * Filtering utilities for figures based on codes and filter mode
 */

import { FILTER_MODES, SORT_OPTIONS } from "./constants.js";

// Hidden codes that should be used for filtering but not displayed
const HIDDEN_CODES = ["subset.interactivity", "spatial use.abstract"];

// Codes that should be hidden by default (can be toggled with a button)
const HIDE_BY_DEFAULT_CODES = [
  "Other.Benchmarking / Method evaluation",
  "Other.Other.Schematic diagrams",
  "Data.Modality.bulk RNA-seq",
  "Data.Modality.snRNA-seq",
  "Data.Modality.ATAC-seq",
  "Data.Modality.Out of scope",
];

/**
 * Check if a code should be hidden from display
 * @param {string} code - Code to check
 * @returns {boolean} True if code should be hidden
 */
export const isHiddenCode = (code) => HIDDEN_CODES.includes(code);

/**
 * Filter out hidden codes from a code array
 * @param {string[]} codes - Array of codes
 * @returns {string[]} Codes excluding hidden codes
 */
export const filterOutHiddenCodes = (codes) => {
  return codes.filter((code) => !isHiddenCode(code));
};

/**
 * Check if a figure should be hidden by default
 * @param {object} figure - Figure object
 * @returns {boolean} True if figure has any hide-by-default codes
 */
export const shouldHideByDefault = (figure) => {
  const figCodes = figure.codes || [];
  return HIDE_BY_DEFAULT_CODES.some((code) => figCodes.includes(code));
};

/**
 * Filter out figures with hide-by-default codes (unless showing them)
 * @param {object[]} figures - Array of figure objects
 * @param {boolean} showHiddenByDefault - Whether to show figures with hide-by-default codes
 * @returns {object[]} Filtered figures array
 */
export const filterHideByDefault = (figures, showHiddenByDefault) => {
  if (showHiddenByDefault) return figures;
  return figures.filter((fig) => !shouldHideByDefault(fig));
};

/**
 * Filter figures based on selected codes and filter mode
 * @param {object[]} figures - Array of figure objects
 * @param {string[]} selectedCodes - Array of selected code strings
 * @param {string} filterMode - Filter mode (AND or OR)
 * @returns {object[]} Filtered figures array
 */
export const filterFigures = (figures, selectedCodes, filterMode) => {
  if (selectedCodes.length === 0) return figures;

  return figures.filter((fig) => {
    const figCodes = fig.codes || [];

    if (filterMode === FILTER_MODES.AND) {
      return selectedCodes.every((code) => figCodes.includes(code));
    }

    return selectedCodes.some((code) => figCodes.includes(code));
  });
};

/**
 * Calculate which codes are still available (have matching figures)
 * @param {object[]} figures - Array of all figure objects
 * @param {string[]} uniqueCodes - Array of all unique codes
 * @param {string[]} selectedCodes - Array of currently selected codes
 * @param {string} filterMode - Filter mode (AND or OR)
 * @returns {Set} Set of available codes
 */
export const calculateAvailableCodes = (
  figures,
  uniqueCodes,
  selectedCodes,
  filterMode,
) => {
  const available = new Set();

  if (selectedCodes.length === 0) {
    uniqueCodes.forEach((code) => available.add(code));
    return available;
  }

  uniqueCodes.forEach((code) => {
    if (selectedCodes.includes(code)) {
      available.add(code);
      return;
    }

    const testSelection = [...selectedCodes, code];
    const hasResults = figures.some((fig) => {
      const figCodes = fig.codes || [];

      if (filterMode === FILTER_MODES.AND) {
        return testSelection.every((selectedCode) =>
          figCodes.includes(selectedCode),
        );
      }

      return testSelection.some((selectedCode) =>
        figCodes.includes(selectedCode),
      );
    });

    if (hasResults) {
      available.add(code);
    }
  });

  return available;
};

/**
 * Count how many figures (within the current search/toggle context, before
 * code-filtering) carry each code. Used to show real result counts next to
 * filter values in the sidebar.
 * @param {object[]} figures - Figures to count over
 * @param {string[]} uniqueCodes - All known code strings
 * @returns {Map<string, number>} Map of code -> figure count
 */
export const calculateCodeCounts = (figures, uniqueCodes) => {
  const counts = new Map(uniqueCodes.map((code) => [code, 0]));

  figures.forEach((fig) => {
    (fig.codes || []).forEach((code) => {
      if (counts.has(code)) {
        counts.set(code, counts.get(code) + 1);
      }
    });
  });

  return counts;
};

/**
 * Parse a figure's publication year into a comparable number.
 * @param {string|number|null} year
 * @returns {number|null} Parsed year, or null if not a valid year
 */
export const parseFigureYear = (year) => {
  const parsed = parseInt(year, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Sort figures according to a supported sort option.
 *
 * "Relevance" has no independent ordering of its own: with an active search
 * it preserves the incoming (already relevance-ranked) order from the
 * search, and otherwise falls back to the app's default ordering (figures
 * with more classification codes first).
 *
 * @param {object[]} figures - Figures to sort (already filtered)
 * @param {string} sortOption - One of SORT_OPTIONS
 * @param {boolean} isSearchActive - Whether a research-question search is active
 * @returns {object[]} New sorted array
 */
export const sortFigures = (figures, sortOption, isSearchActive) => {
  const sorted = [...figures];

  switch (sortOption) {
    case SORT_OPTIONS.NEWEST:
      return sorted.sort((a, b) => {
        const ay = parseFigureYear(a.year);
        const by = parseFigureYear(b.year);
        if (ay === null && by === null) return 0;
        if (ay === null) return 1;
        if (by === null) return -1;
        return by - ay;
      });

    case SORT_OPTIONS.OLDEST:
      return sorted.sort((a, b) => {
        const ay = parseFigureYear(a.year);
        const by = parseFigureYear(b.year);
        if (ay === null && by === null) return 0;
        if (ay === null) return 1;
        if (by === null) return -1;
        return ay - by;
      });

    case SORT_OPTIONS.TITLE:
      return sorted.sort((a, b) => {
        const at = a.paperTitle || a.sourceName || "";
        const bt = b.paperTitle || b.sourceName || "";
        return at.localeCompare(bt);
      });

    case SORT_OPTIONS.RELEVANCE:
    default:
      if (isSearchActive) return sorted;
      return sorted.sort((a, b) => {
        const aCount = (a.codes && a.codes.length) || 0;
        const bCount = (b.codes && b.codes.length) || 0;
        const aScore = aCount > 1 ? 2 : aCount === 1 ? 1 : 0;
        const bScore = bCount > 1 ? 2 : bCount === 1 ? 1 : 0;
        return bScore - aScore;
      });
  }
};
