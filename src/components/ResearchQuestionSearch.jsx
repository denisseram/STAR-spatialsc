import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { searchSimilarQuestions, getAllQuestions, containsSubstring } from "../utils/semanticSearchUtils.js";
import { SEARCH_MODES, SEARCH_MODE_LABELS, SEARCH_DEBOUNCE_MS } from "../utils/constants.js";

/**
 * ResearchQuestionSearch - The app's single primary search experience.
 * Matches figures against the research-question codes attached to them,
 * in one of two genuinely different modes:
 *  - Keywords: plain substring match
 *  - Similar meaning: fuzzy (Levenshtein-based) word/phrase similarity
 *
 * Calls onResults with an ordered array of matching figures (relevance
 * order), an empty array when there are no matches, or null when there is
 * no active query.
 */
export default function ResearchQuestionSearch({ figures, onResults, resetSignal }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState(SEARCH_MODES.KEYWORDS);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const allQuestions = useMemo(() => getAllQuestions(figures), [figures]);

  const runSearch = useCallback(
    (rawQuery, searchMode) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) {
        onResults(null);
        return;
      }

      let matchedQuestions;
      if (searchMode === SEARCH_MODES.KEYWORDS) {
        matchedQuestions = allQuestions.filter((q) => containsSubstring(q, trimmed));
      } else {
        matchedQuestions = searchSimilarQuestions(trimmed, allQuestions, 0.6).map((r) => r.text);
      }

      const matchedSet = new Set(matchedQuestions);
      const order = new Map(matchedQuestions.map((q, i) => [q, i]));

      const matchedFigures = figures
        .filter((figure) => {
          const figureQuestions = (figure.codes || []).filter((code) => !code.includes("."));
          return figureQuestions.some((q) => matchedSet.has(q));
        })
        .sort((a, b) => {
          const aRank = Math.min(
            ...(a.codes || []).filter((c) => matchedSet.has(c)).map((c) => order.get(c)),
            Infinity
          );
          const bRank = Math.min(
            ...(b.codes || []).filter((c) => matchedSet.has(c)).map((c) => order.get(c)),
            Infinity
          );
          return aRank - bRank;
        });

      onResults(matchedFigures);
    },
    [allQuestions, figures, onResults]
  );

  // Debounce so we don't re-run the (fuzzy) search on every keystroke, and
  // so there is a genuine brief "searching" state rather than a fake one.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setIsSearching(false);
      onResults(null);
      return undefined;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      runSearch(query, mode);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearching(false);
    runSearch(query, mode);
  };

  const clearSearch = useCallback(() => {
    setQuery("");
    onResults(null);
    inputRef.current?.focus();
  }, [onResults]);

  // Allow a parent "clear all" action to reset this field's own local state.
  useEffect(() => {
    if (resetSignal === undefined || resetSignal === 0) return;
    setQuery("");
    setIsSearching(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <label htmlFor="research-question-search" className="search-bar-label">
        Search by research question
      </label>

      <div className="search-bar-row">
        <div className="search-bar-input-wrap">
          <svg className="search-bar-icon" aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
            <path
              fill="currentColor"
              d="M13.6 12.2a6 6 0 1 0-1.4 1.4l4 4 1.4-1.4-4-4ZM8 12.5A4.5 4.5 0 1 1 12.5 8 4.5 4.5 0 0 1 8 12.5Z"
            />
          </svg>
          <input
            ref={inputRef}
            id="research-question-search"
            type="search"
            className="search-bar-input"
            placeholder="Describe what you want to find…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-bar-clear"
              onClick={clearSearch}
              aria-label="Clear search input"
            >
              ✕
            </button>
          )}
        </div>

        <button type="submit" className="search-bar-submit">
          Search
        </button>
      </div>

      <div className="search-mode-row">
        <span className="search-mode-label" id="search-mode-label">
          Match:
        </span>
        <div className="search-mode-toggle" role="group" aria-labelledby="search-mode-label">
          {Object.values(SEARCH_MODES).map((m) => (
            <button
              key={m}
              type="button"
              className={`search-mode-button ${mode === m ? "active" : ""}`}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {SEARCH_MODE_LABELS[m]}
            </button>
          ))}
        </div>
        {isSearching && (
          <span className="search-status" role="status">
            Searching…
          </span>
        )}
      </div>
    </form>
  );
}
