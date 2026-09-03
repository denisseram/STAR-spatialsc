import React, { useState, useCallback, useMemo, useEffect } from "react";
import "../styles/FigureGrid.css";

import { FILTER_MODES, SORT_OPTIONS } from "../utils/constants.js";
import { useCodeHierarchy, useFiltering, useStats } from "../hooks/useFiltering.js";
import { useCodeSelection, useCodeBatchOperations } from "../hooks/useCodeSelection.js";
import { filterHideByDefault, calculateCodeCounts, sortFigures } from "../utils/filterUtils.js";

import Switch from "./Switch.jsx";
import ResearchQuestionSearch from "./ResearchQuestionSearch.jsx";
import FilterSidebar from "./FilterSidebar.jsx";
import FilterDrawer from "./FilterDrawer.jsx";
import ActiveFilterBar from "./ActiveFilterBar.jsx";
import FigureCard from "./FigureCard.jsx";
import Modal from "./Modal.jsx";

const formatCount = (n) => n.toLocaleString("en-US");

/**
 * FigureGrid - Main component for displaying, searching, and filtering figures
 */
export default function FigureGrid({ figures = [] }) {
  const [modal, setModal] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const [filterMode, setFilterMode] = useState(FILTER_MODES.AND);
  const [showInteractivityOnly, setShowInteractivityOnly] = useState(false);
  const [showHiddenByDefault, setShowHiddenByDefault] = useState(false);
  const [semanticSearchResults, setSemanticSearchResults] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchResetSignal, setSearchResetSignal] = useState(0);

  // Use custom hooks for state and calculations
  const { uniqueCodes, grouped: groupedCodes, misc: miscCodes, single: singleLevelCodes } = useCodeHierarchy(figures);
  const { selectedCodes, setSelectedCodes, toggleCode } = useCodeSelection(groupedCodes);
  const { clearAll } = useCodeBatchOperations(groupedCodes, miscCodes, setSelectedCodes);
  const stats = useStats(figures);

  const isSearchActive = semanticSearchResults !== null;

  // 1. Scope by search (relevance-ordered figures from ResearchQuestionSearch, or everything)
  const searchScopedFigures = isSearchActive ? semanticSearchResults : figures;

  // 2. Scope by the two visibility toggles
  const toggleScopedFigures = useMemo(() => {
    const afterInteractivity = showInteractivityOnly
      ? searchScopedFigures.filter((fig) => (fig.codes || []).includes("subset.interactivity"))
      : searchScopedFigures;
    return filterHideByDefault(afterInteractivity, showHiddenByDefault);
  }, [searchScopedFigures, showInteractivityOnly, showHiddenByDefault]);

  // 3. Scope by selected classification codes
  const { filteredFigures, availableCodes } = useFiltering(toggleScopedFigures, selectedCodes, filterMode);

  // Real per-code result counts for the sidebar (independent of code selection itself)
  const codeCounts = useMemo(
    () => calculateCodeCounts(toggleScopedFigures, uniqueCodes),
    [toggleScopedFigures, uniqueCodes]
  );

  // 4. Sort (relevance order: preserves search ranking, otherwise most-coded first)
  const finalFilteredFigures = useMemo(
    () => sortFigures(filteredFigures, SORT_OPTIONS.RELEVANCE, isSearchActive),
    [filteredFigures, isSearchActive]
  );

  const filteredPapersCount = new Set(finalFilteredFigures.map((fig) => fig.sourceGuid)).size;

  const hasActiveFilters =
    selectedCodes.length > 0 || showInteractivityOnly || showHiddenByDefault || isSearchActive;

  // Event handlers
  const handleOpenDetail = useCallback((figure) => {
    setModal({ figure });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const handleSearchResults = useCallback((results) => {
    setSemanticSearchResults(results);
  }, []);

  const handleClearFilters = useCallback(() => {
    clearAll();
    setFilterMode(FILTER_MODES.AND);
    setShowInteractivityOnly(false);
    setShowHiddenByDefault(false);
  }, [clearAll]);

  const handleClearSearch = useCallback(() => {
    setSemanticSearchResults(null);
    setSearchResetSignal((n) => n + 1);
  }, []);

  const handleClearEverything = useCallback(() => {
    handleClearFilters();
    handleClearSearch();
  }, [handleClearFilters, handleClearSearch]);

  // Close the mobile drawer if the viewport grows past the breakpoint while open
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 901px)");
    const handleChange = (e) => {
      if (e.matches) setIsFilterDrawerOpen(false);
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  if (!figures || figures.length === 0) {
    return (
      <div className="page">
        <div className="data-error-state">
          <h1>Spatial Transcriptomics Survey</h1>
          <p>No figure data is available right now. Please try reloading the page.</p>
        </div>
      </div>
    );
  }

  const sidebarProps = {
    selectedCodes,
    filterMode,
    onFilterModeChange: setFilterMode,
    groupedCodes,
    miscCodes,
    singleLevelCodes,
    availableCodes,
    codeCounts,
    onToggleCode: toggleCode,
    onClearAll: handleClearEverything,
    figures,
    filteredFigures
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-header">
          <div className="topbar-left">
            <h1 className="topbar-title">Spatial Transcriptomics Survey</h1>
            <p className="topbar-subtitle">
              {formatCount(stats.totalPapers)} papers · {formatCount(stats.totalFigures)} figures ·{" "}
              {formatCount(uniqueCodes.length)} codes
            </p>
          </div>
        </div>

        <div className="exploration-toolbar">
          <ResearchQuestionSearch
            figures={figures}
            onResults={handleSearchResults}
            resetSignal={searchResetSignal}
          />

          <div className="toolbar-controls">
            <Switch
              id="toggle-interactivity"
              checked={showInteractivityOnly}
              onChange={() => setShowInteractivityOnly((v) => !v)}
              label="Interactive papers only"
            />
            <Switch
              id="toggle-hidden-by-default"
              checked={showHiddenByDefault}
              onChange={() => setShowHiddenByDefault((v) => !v)}
              label="Include benchmarking and schematic figures"
            />
            <Switch
              id="toggle-show-codes"
              checked={showCodes}
              onChange={() => setShowCodes((v) => !v)}
              label="Display classification tags"
            />
          </div>
        </div>
      </header>

      <div className="container">
        <aside className="sidebar" aria-labelledby="filters-heading-desktop">
          <FilterSidebar titleId="filters-heading-desktop" {...sidebarProps} />
        </aside>

        <button
          type="button"
          className="mobile-filters-button"
          onClick={() => setIsFilterDrawerOpen(true)}
        >
          Filters
          {selectedCodes.length > 0 && (
            <span className="mobile-filters-count">{selectedCodes.length}</span>
          )}
        </button>

        <FilterDrawer isOpen={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)}>
          <FilterSidebar titleId="filter-drawer-title" {...sidebarProps} />
        </FilterDrawer>

        <main className="main-content">
          <ActiveFilterBar
            selectedCodes={selectedCodes}
            onRemoveCode={toggleCode}
            showInteractivityOnly={showInteractivityOnly}
            onRemoveInteractivityOnly={() => setShowInteractivityOnly(false)}
            showHiddenByDefault={showHiddenByDefault}
            onRemoveHiddenByDefault={() => setShowHiddenByDefault(false)}
            onClearAll={handleClearEverything}
          />

          <div className="results-header">
            <p className="results-summary">
              {hasActiveFilters ? (
                <>
                  <strong>{formatCount(finalFilteredFigures.length)}</strong> of{" "}
                  <strong>{formatCount(stats.totalFigures)}</strong> figures from{" "}
                  <strong>{formatCount(filteredPapersCount)}</strong> of{" "}
                  <strong>{formatCount(stats.totalPapers)}</strong> papers
                </>
              ) : (
                <>
                  <strong>{formatCount(finalFilteredFigures.length)}</strong> figures from{" "}
                  <strong>{formatCount(filteredPapersCount)}</strong> papers
                </>
              )}
            </p>
          </div>

          {finalFilteredFigures.length === 0 ? (
            <div className="no-results">
              <p className="no-results-message">No figures match your current search and filters.</p>
              <div className="no-results-actions">
                {(selectedCodes.length > 0 || showInteractivityOnly || showHiddenByDefault) && (
                  <button type="button" className="no-results-action" onClick={handleClearFilters}>
                    Clear filters
                  </button>
                )}
                {isSearchActive && (
                  <button type="button" className="no-results-action" onClick={handleClearSearch}>
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="figures-grid">
              {finalFilteredFigures.map((fig) => (
                <FigureCard
                  key={fig.guid}
                  figure={fig}
                  showCodes={showCodes}
                  onOpenDetail={handleOpenDetail}
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
