import React, { useState, useCallback } from "react";
import "../styles/FigureGrid.css";

import { FILTER_MODES } from "../utils/constants.js";
import { useCodeHierarchy, useFiltering, useStats } from "../hooks/useFiltering.js";
import { useCodeSelection, useCodeBatchOperations } from "../hooks/useCodeSelection.js";

import CodeButton from "./CodeButton.jsx";
import CodeHierarchy from "./CodeHierarchy.jsx";
import FigureCard from "./FigureCard.jsx";
import Modal from "./Modal.jsx";
import WordCloud from "./WordCloud.jsx";

/**
 * FigureGrid - Main component for displaying and filtering figures
 */
export default function FigureGrid({ figures = [] }) {
  const [modal, setModal] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const [filterMode, setFilterMode] = useState(FILTER_MODES.AND);

  // Use custom hooks for state and calculations
  const { grouped: groupedCodes, misc: miscCodes, single: singleLevelCodes } = useCodeHierarchy(figures);
  const { selectedCodes, setSelectedCodes, toggleCode } = useCodeSelection(groupedCodes);
  const { selectAll, clearAll } = useCodeBatchOperations(groupedCodes, miscCodes, setSelectedCodes);
  const { filteredFigures, availableCodes } = useFiltering(figures, selectedCodes, filterMode);
  const stats = useStats(figures);

  // Event handlers
  const handleImageClick = useCallback((figure) => {
    setModal({
      src: figure.imagePath,
      title: figure.name,
      citation: figure.citation,
      paperTitle: figure.paperTitle,
      paperUrl: figure.paperUrl
    });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="topbar-title">Spatial Transcriptomics Survey</h1>
        <p className="topbar-subtitle">
          {stats.totalPapers} papers · {stats.totalFigures} figures
        </p>
      </header>

      <div className="container">
        <aside className="sidebar">
          <h2>Filter by Codes</h2>
          
          <div className="filter-controls">
            <div className="filter-actions">
              <button onClick={selectAll}>Select All</button>
              <button onClick={clearAll}>Clear</button>
            </div>
            
            <div className="filter-mode">
              <button 
                className={`mode-button ${filterMode === FILTER_MODES.AND ? "active" : ""}`}
                onClick={() => setFilterMode(FILTER_MODES.AND)}
              >
                AND
              </button>
              <button 
                className={`mode-button ${filterMode === FILTER_MODES.OR ? "active" : ""}`}
                onClick={() => setFilterMode(FILTER_MODES.OR)}
              >
                OR
              </button>
            </div>
          </div>

          {singleLevelCodes.length > 0 && (
            <WordCloud
              figures={figures}
              filteredFigures={filteredFigures}
            />
          )}

          <CodeHierarchy
            groupedCodes={groupedCodes}
            miscCodes={miscCodes}
            selectedCodes={selectedCodes}
            availableCodes={availableCodes}
            onToggleCode={toggleCode}
          />
        </aside>

        <main className="main-content">
          <div className="stats">
            <div className="stats-text">
              Showing <strong>{filteredFigures.length}</strong> of{" "}
              <strong>{figures.length}</strong> figures
            </div>
            
            <div className="toggle-codes-container">
              <span className="toggle-codes-label">Show Codes</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={showCodes}
                  onChange={() => setShowCodes(!showCodes)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {filteredFigures.length === 0 ? (
            <div className="no-results">
              No figures match the selected codes.
            </div>
          ) : (
            <div className="figures-grid">
              {filteredFigures.map((fig) => (
                <FigureCard
                  key={fig.guid}
                  figure={fig}
                  showCodes={showCodes}
                  onImageClick={() => handleImageClick(fig)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal modal={modal} onClose={closeModal} />
    </div>
  );
}

