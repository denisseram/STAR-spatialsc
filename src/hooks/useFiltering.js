import { useMemo } from "react";
import { groupCodesByHierarchy } from "../utils/codeUtils.js";
import { filterFigures, calculateAvailableCodes } from "../utils/filterUtils.js";

/**
 * Custom hook for code hierarchy organization
 */
export const useCodeHierarchy = (figures) => {
  const uniqueCodes = useMemo(
    () => [...new Set(figures.flatMap((f) => f.codes || []))],
    [figures]
  );

  const { grouped, misc, single } = useMemo(
    () => groupCodesByHierarchy(uniqueCodes),
    [uniqueCodes]
  );

  return { uniqueCodes, grouped, misc, single };
};

/**
 * Custom hook for filtering figures and calculating available codes
 */
export const useFiltering = (figures, selectedCodes, filterMode) => {
  const uniqueCodes = useMemo(
    () => [...new Set(figures.flatMap((f) => f.codes || []))],
    [figures]
  );

  const filteredFigures = useMemo(
    () => filterFigures(figures, selectedCodes, filterMode),
    [figures, selectedCodes, filterMode]
  );

  const availableCodes = useMemo(
    () => calculateAvailableCodes(figures, uniqueCodes, selectedCodes, filterMode),
    [figures, uniqueCodes, selectedCodes, filterMode]
  );

  return { filteredFigures, availableCodes };
};

/**
 * Custom hook for computing basic statistics
 */
export const useStats = (figures) => {
  return useMemo(() => ({
    totalFigures: figures.length,
    totalPapers: new Set(figures.map((f) => f.sourceGuid)).size
  }), [figures]);
};
