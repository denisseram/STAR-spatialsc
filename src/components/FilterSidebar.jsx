import React from "react";
import CodeHierarchy from "./CodeHierarchy.jsx";
import WordCloud from "./WordCloud.jsx";
import { FILTER_MODES } from "../utils/constants.js";

/**
 * FilterSidebar - Persistent filter panel: header (active count, AND/OR
 * match mode, and clear all in one row), keyword cloud, and the
 * collapsible code category accordions. Rendered both as the inline
 * desktop sidebar and, unchanged, inside the mobile filter drawer.
 */
export default function FilterSidebar({
  titleId,
  selectedCodes,
  filterMode,
  onFilterModeChange,
  groupedCodes,
  miscCodes,
  singleLevelCodes,
  availableCodes,
  codeCounts,
  onToggleCode,
  onClearAll,
  figures,
  filteredFigures
}) {
  const activeCount = selectedCodes.length;

  return (
    <>
      <div className="sidebar-header">
        <h2 id={titleId}>Filters</h2>
        <div className="sidebar-header-meta">
          <span className="sidebar-active-count" aria-live="polite">
            {activeCount} active
          </span>
          <div className="sidebar-header-actions">
            <div className="filter-mode" role="group" aria-label="Filter combination logic">
              <button
                type="button"
                className={`mode-button ${filterMode === FILTER_MODES.AND ? "active" : ""}`}
                aria-pressed={filterMode === FILTER_MODES.AND}
                aria-label="Match all selected filters (AND)"
                onClick={() => onFilterModeChange(FILTER_MODES.AND)}
              >
                AND
              </button>
              <button
                type="button"
                className={`mode-button ${filterMode === FILTER_MODES.OR ? "active" : ""}`}
                aria-pressed={filterMode === FILTER_MODES.OR}
                aria-label="Match any selected filter (OR)"
                onClick={() => onFilterModeChange(FILTER_MODES.OR)}
              >
                OR
              </button>
            </div>
            <button
              type="button"
              className="sidebar-clear-all"
              onClick={onClearAll}
              aria-label="Clear all filters"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      {singleLevelCodes.length > 0 && (
        <WordCloud figures={figures} filteredFigures={filteredFigures} />
      )}

      <div className="code-hierarchy">
        <CodeHierarchy
          groupedCodes={groupedCodes}
          miscCodes={miscCodes}
          selectedCodes={selectedCodes}
          availableCodes={availableCodes}
          codeCounts={codeCounts}
          onToggleCode={onToggleCode}
        />
      </div>
    </>
  );
}
