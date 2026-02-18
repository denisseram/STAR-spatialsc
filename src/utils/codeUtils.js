/**
 * Code parsing and hierarchy utilities
 */

import { CODE_LEVELS } from "./constants.js";
import { isHiddenCode } from "./filterUtils.js";

/**
 * Parse a code string into father and child parts
 * @param {string} code - Code string in format "father" or "father.child"
 * @returns {{father: string, child: string}} Parsed code parts
 */
export const parseCode = (code) => {
  const parts = code.split(".");
  
  if (parts.length === CODE_LEVELS.TRIPLE) {
    return { 
      father: parts[1] || "Unknown", 
      child: parts[2] || "" 
    };
  }
  
  if (parts.length === CODE_LEVELS.DOUBLE) {
    return { 
      father: parts[0] || "Unknown", 
      child: parts[1] || "" 
    };
  }
  
  return { 
    father: parts[0] || "Unknown", 
    child: "" 
  };
};

/**
 * Group codes by their hierarchical structure
 * @param {string[]} codes - Array of code strings
 * @returns {{grouped: object, misc: string[], single: string[]}} Grouped codes structure
 */
export const groupCodesByHierarchy = (codes) => {
  const grouped = {};
  const misc = [];
  const single = [];

  // Sort codes by level (deepest first) to avoid structure conflicts
  const sortedCodes = [...codes]
    .filter(code => !isHiddenCode(code))  // Filter out hidden codes
    .sort((a, b) => {
      return b.split(".").length - a.split(".").length;
    });

  sortedCodes.forEach((code) => {
    const parts = code.split(".");
    const length = parts.length;

    if (length === CODE_LEVELS.SINGLE) {
      single.push(code);
      return;
    }

    if (length === CODE_LEVELS.QUADRUPLE) {
      const [titulo, padre, hijo, grandchild] = parts;
      if (!grouped[titulo]) grouped[titulo] = {};
      if (!grouped[titulo][padre]) {
        grouped[titulo][padre] = {};
      }
      // Convert Set to object if needed
      if (grouped[titulo][padre] instanceof Set) {
        grouped[titulo][padre] = {};
      }
      if (!grouped[titulo][padre][hijo]) grouped[titulo][padre][hijo] = new Set();
      grouped[titulo][padre][hijo].add(grandchild);
      return;
    }

    if (length === CODE_LEVELS.TRIPLE) {
      const [titulo, padre, hijo] = parts;
      if (!grouped[titulo]) grouped[titulo] = {};
      if (!grouped[titulo][padre]) {
        grouped[titulo][padre] = new Set();
      }
      
      if (grouped[titulo][padre] instanceof Set) {
        grouped[titulo][padre].add(hijo);
      } else {
        // padre is an object (has grandchildren)
        // Add hijo as a key with empty Set if it doesn't exist
        if (!grouped[titulo][padre][hijo]) {
          grouped[titulo][padre][hijo] = new Set();
        }
      }
      return;
    }

    if (length === CODE_LEVELS.DOUBLE) {
      const [titulo, padre] = parts;
      if (!grouped[titulo]) grouped[titulo] = {};
      if (!grouped[titulo][padre]) grouped[titulo][padre] = new Set();
      return;
    }

    misc.push(code);
  });

  return { grouped, misc, single };
};

/**
 * Get all leaf-level codes (most specific codes in hierarchy)
 * @param {{grouped: object}} groupedCodes - Grouped codes from groupCodesByHierarchy
 * @returns {string[]} Array of all leaf-level codes
 */
export const getAllLeafCodes = (groupedCodes) => {
  const leafCodes = [];
  
  Object.entries(groupedCodes.grouped || {}).forEach(([titulo, padres]) => {
    Object.entries(padres).forEach(([padre, hijos]) => {
      if (hijos instanceof Set) {
        Array.from(hijos).forEach(hijo => {
          leafCodes.push(`${titulo}.${padre}.${hijo}`);
        });
      } else {
        Object.entries(hijos).forEach(([hijo, grandchildren]) => {
          Array.from(grandchildren || new Set()).forEach(grandchild => {
            leafCodes.push(`${titulo}.${padre}.${hijo}.${grandchild}`);
          });
        });
      }
    });
  });
  
  return leafCodes;
};
