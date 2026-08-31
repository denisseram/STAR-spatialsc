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
 * Some papers were imported into MAXQDA as two separate PDF sources
 * (duplicate source_guid). Only the overall paper total should treat them
 * as one paper — filtered/per-code counts elsewhere intentionally keep
 * counting them separately, since collapsing them there would also drop
 * figures that only exist under one of the two source_guids.
 */
const DUPLICATE_SOURCE_GUID_ALIASES = {
  "4BF96435-A615-45D7-877C-451087C95C94": "D9C049DC-F969-489D-8714-2F4D7A175E06",
};

/**
 * Custom hook for computing basic statistics
 */
export const useStats = (figures) => {
  return useMemo(() => ({
    totalFigures: figures.length,
    totalPapers: new Set(
      figures.map((f) => DUPLICATE_SOURCE_GUID_ALIASES[f.sourceGuid] || f.sourceGuid)
    ).size
  }), [figures]);
};
