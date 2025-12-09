import React from "react";
import CodeGroup from "./CodeGroup.jsx";

export default function Sidebar({
  figures,
  selectedCodes,
  setSelectedCodes,
  filterMode,
  setFilterMode,
  toggleCode,
  clearAll
}) {
  // Deduplicate codes
  const uniqueCodes = [...new Set(figures.flatMap((f) => f.codes || []))];

  return (
    <aside className="sidebar">
      <h2>Filter by Codes</h2>
      <div className="filter-controls">
        <div className="filter-actions">
          <button onClick={() => setSelectedCodes(uniqueCodes)}>Select All</button>
          <button onClick={clearAll}>Clear</button>
        </div>
        <div className="filter-mode">
          <button
            className={`mode-button ${filterMode === "AND" ? "active" : ""}`}
            onClick={() => setFilterMode("AND")}
          >
            AND
          </button>
          <button
            className={`mode-button ${filterMode === "OR" ? "active" : ""}`}
            onClick={() => setFilterMode("OR")}
          >
            OR
          </button>
        </div>
      </div>

      <CodeGroup
        uniqueCodes={uniqueCodes}
        selectedCodes={selectedCodes}
        toggleCode={toggleCode}
      />
    </aside>
  );
}
