/**
 * Filtering utilities for figures based on codes and filter mode
 */

import { FILTER_MODES } from "./constants.js";

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
export const calculateAvailableCodes = (figures, uniqueCodes, selectedCodes, filterMode) => {
  const available = new Set();

  if (selectedCodes.length === 0) {
    uniqueCodes.forEach(code => available.add(code));
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
        return testSelection.every((selectedCode) => figCodes.includes(selectedCode));
      }
      
      return testSelection.some((selectedCode) => figCodes.includes(selectedCode));
    });

    if (hasResults) {
      available.add(code);
    }
  });

  return available;
};
