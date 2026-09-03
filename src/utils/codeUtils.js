/**
 * Code parsing and hierarchy utilities
 */

import { CODE_LEVELS } from "./constants.js";
import { isHiddenCode, filterOutHiddenCodes } from "./filterUtils.js";

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
 * Shared category -> color (RGB triplet string) mapping used by both the
 * filter sidebar (CodeHierarchy) and the figure card / modal metadata views,
 * so a "Data"/"Task"/"Visualization" code always renders in the same color.
 */
export const CATEGORY_COLORS = {
  Data: "188,68,40",
  Task: "232,169,58",
  Visualization: "39,132,96"
};

export const getCategoryColor = (titulo) => CATEGORY_COLORS[titulo] || null;

/**
 * Contextual replacements for the ambiguous "None" leaf value that some
 * categories use to mean "this attribute was not present/applicable".
 * Keyed by the parent ("padre") category the leaf belongs to.
 */
const NONE_LABEL_OVERRIDES = {
  "Communicative/Contextualization": "No contextualization",
  "Comparative Design": "No comparative design",
  "Scalability Strategy": "No scalability strategy",
  "Abstraction": "No abstraction",
  "Metadata": "No metadata"
};

/**
 * Turn an ambiguous "None" (or "None (Item-level)") leaf code into a
 * contextual label, e.g. "Communicative/Contextualization.None" ->
 * "No contextualization". Non-"None" labels are returned unchanged.
 * @param {string} padre - Parent category name (e.g. "Comparative Design")
 * @param {string} hijo - Leaf value (e.g. "None", "None (Item-level)")
 * @returns {string} Display label
 */
export const getContextualLabel = (padre, hijo) => {
  if (!hijo || !hijo.startsWith("None")) return hijo;

  const suffix = hijo.slice("None".length).trim(); // e.g. "(Item-level)"
  const base = NONE_LABEL_OVERRIDES[padre] || `No ${padre.toLowerCase()}`;
  return suffix ? `${base} ${suffix}` : base;
};

/**
 * Group a figure's raw code strings into display-ready buckets, mirroring
 * the hierarchy used by the filter sidebar. Shared by FigureCard (summary)
 * and Modal (complete classification metadata) so both stay in sync.
 * @param {string[]} codes - Raw code strings for one figure
 * @returns {{main: object[], single: object[]}} Display-ready code groups
 */
export const groupDisplayCodes = (codes) => {
  const visibleCodes = filterOutHiddenCodes(codes || []);
  const main = [];
  const single = [];

  visibleCodes.forEach((code) => {
    const parts = code.split(".");

    if (parts.length === CODE_LEVELS.SINGLE) {
      single.push({ code, text: code, titulo: "" });
      return;
    }

    const titulo = parts[0];
    const padre = parts[1];
    const hijo = getContextualLabel(padre, parts[2]);

    let displayText;
    if (parts.length === CODE_LEVELS.QUADRUPLE) {
      displayText = `${padre} : ${hijo} : ${parts[3]}`;
    } else if (parts.length === CODE_LEVELS.TRIPLE) {
      displayText = `${padre} : ${hijo}`;
    } else {
      displayText = padre;
    }

    main.push({
      code,
      text: displayText,
      titulo,
      color: getCategoryColor(titulo)
    });
  });

  return { main, single };
};

/**
 * Format a single raw code string into a short, human-readable chip label,
 * e.g. "Visualization.Comparative Design.None" -> "No comparative design".
 * Used by the active-filter chip bar.
 * @param {string} code - Raw code string
 * @returns {string} Display label
 */
export const formatCodeLabel = (code) => {
  const { main, single } = groupDisplayCodes([code]);
  if (main.length > 0) return main[0].text;
  if (single.length > 0) return single[0].text;
  return code;
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
