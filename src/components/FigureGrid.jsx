import React, { useState, useCallback } from "react";
import "../styles/FigureGrid.css";

import { FILTER_MODES } from "../utils/constants.js";
import { useCodeHierarchy, useFiltering, useStats } from "../hooks/useFiltering.js";
import { useCodeSelection, useCodeBatchOperations } from "../hooks/useCodeSelection.js";
import { filterHideByDefault } from "../utils/filterUtils.js";

import CodeButton from "./CodeButton.jsx";
import CodeHierarchy from "./CodeHierarchy.jsx";
import FigureCard from "./FigureCard.jsx";
import Modal from "./Modal.jsx";
import WordCloud from "./WordCloud.jsx";
import SemanticSearch from "./SemanticSearch.jsx";

/**
 * FigureGrid - Main component for displaying and filtering figures
 */
export default function FigureGrid({ figures = [] }) {
  const [modal, setModal] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const [filterMode, setFilterMode] = useState(FILTER_MODES.AND);
  const [showInteractivityOnly, setShowInteractivityOnly] = useState(false);
  const [showHiddenByDefault, setShowHiddenByDefault] = useState(false);
  const [semanticSearchResults, setSemanticSearchResults] = useState(null);

  // Use custom hooks for state and calculations
  const { uniqueCodes, grouped: groupedCodes, misc: miscCodes, single: singleLevelCodes } = useCodeHierarchy(figures);
  const { selectedCodes, setSelectedCodes, toggleCode } = useCodeSelection(groupedCodes);
  const { selectAll, clearAll } = useCodeBatchOperations(groupedCodes, miscCodes, setSelectedCodes);
  const { filteredFigures, availableCodes } = useFiltering(figures, selectedCodes, filterMode);
  const stats = useStats(figures);

  // Apply interactivity filter if enabled
  const afterInteractivityFilter = useCallback(() => {
    if (!showInteractivityOnly) return filteredFigures;
    return filteredFigures.filter((fig) => 
      (fig.codes || []).includes("subset.interactivity")
    );
  }, [filteredFigures, showInteractivityOnly])();

  // Apply hide-by-default filter
  const afterHideByDefaultFilter = useCallback(() => {
    return filterHideByDefault(afterInteractivityFilter, showHiddenByDefault);
  }, [afterInteractivityFilter, showHiddenByDefault])();

  // Apply semantic search filter if results exist
  const finalFilteredFigures = useCallback(() => {
    let figures = afterHideByDefaultFilter;
    
    if (semanticSearchResults && semanticSearchResults.length > 0) {
      const resultGuids = new Set(semanticSearchResults.map(fig => fig.guid));
      figures = figures.filter(fig => resultGuids.has(fig.guid));
    }
    
    // Sort: figures with multiple codes first, then figures with 1 code, then figures without codes
    return figures.sort((a, b) => {
      const aCodeCount = (a.codes && a.codes.length) || 0;
      const bCodeCount = (b.codes && b.codes.length) || 0;
      
      // Prioritize by: multiple codes (2+) > single code (1) > no codes (0)
      const aScore = aCodeCount > 1 ? 2 : (aCodeCount === 1 ? 1 : 0);
      const bScore = bCodeCount > 1 ? 2 : (bCodeCount === 1 ? 1 : 0);
      
      return bScore - aScore;
    });
  }, [afterHideByDefaultFilter, semanticSearchResults])();

  // Calculate filtered papers count
  const filteredPapersCount = new Set(finalFilteredFigures.map(fig => fig.sourceGuid)).size;

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

  const handleSemanticSearchResults = useCallback((results) => {
    setSemanticSearchResults(results);
  }, []);

  const clearSemanticSearch = useCallback(() => {
    setSemanticSearchResults(null);
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-header">
          <div className="topbar-left">
            <h1 className="topbar-title">Spatial Transcriptomics Survey</h1>
            <p className="topbar-subtitle">
              {stats.totalPapers} papers · {stats.totalFigures} figures · {uniqueCodes.length} codes
            </p>
          </div>

          <div className="controls-group">
            {/* Show Codes Toggle */}
            <div className="control-item">
              <span className="control-label">Show Codes</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={showCodes}
                  onChange={() => setShowCodes(!showCodes)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Interactivity Button */}
            <div className="control-item">
              <button
                className={`control-button ${showInteractivityOnly ? "active" : ""}`}
                onClick={() => setShowInteractivityOnly(!showInteractivityOnly)}
              >
                {showInteractivityOnly ? "Show All Figures" : "Show Figures from Interactive Papers Only"}
              </button>
            </div>

            {/* Benchmarking/Diagrams Toggle */}
            <div className="control-item">
              <span className="control-label">Show benchmarking and schematic figures </span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={showHiddenByDefault}
                  onChange={() => setShowHiddenByDefault(!showHiddenByDefault)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Semantic Search */}
            {singleLevelCodes.length > 0 && (
              <div className="control-item">
                <SemanticSearch
                  figures={figures}
                  singleLevelCodes={singleLevelCodes}
                  onResults={handleSemanticSearchResults}
                  onClear={clearSemanticSearch}
                />
              </div>
            )}
          </div>
        </div>
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
              Showing <strong>{finalFilteredFigures.length}</strong> of{" "}
              <strong>{figures.length}</strong> figures · Showing{" "}
              <strong>{filteredPapersCount}</strong> of{" "}
              <strong>{stats.totalPapers}</strong> papers
            </div>
          </div>

          {finalFilteredFigures.length === 0 ? (
            <div className="no-results">
              No figures match the selected codes.
            </div>
          ) : (
            <div className="figures-grid">
              {finalFilteredFigures.map((fig) => (
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

