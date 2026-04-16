import React, { useState, useMemo, useCallback } from "react";
import { searchSimilarQuestions, getAllQuestions } from "../utils/semanticSearchUtils.js";
import FigureCard from "./FigureCard.jsx";

/**
 * SemanticSearch - Semantic search component for finding similar research questions and their figures
 * @param {object[]} figures - All figure objects
 * @param {string[]} singleLevelCodes - Single level codes (questions)
 * @param {function} onImageClick - Callback when figure image is clicked
 */
export default function SemanticSearch({ figures, singleLevelCodes, onImageClick }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [minSimilarity, setMinSimilarity] = useState(0.6);
  const [showCodes, setShowCodes] = useState(true);

  // Get all unique questions from figures
  const allQuestions = useMemo(() => {
    return getAllQuestions(figures);
  }, [figures]);

  // Perform semantic search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return searchSimilarQuestions(searchQuery, allQuestions, minSimilarity);
  }, [searchQuery, allQuestions, minSimilarity]);

  // Get figures that contain the matched questions
  const matchedFigures = useMemo(() => {
    if (searchResults.length === 0) {
      return [];
    }
    
    const matchedQuestions = new Set(searchResults.map(r => r.text));
    
    return figures.filter(figure => {
      const figureQuestions = (figure.codes || []).filter(code => !code.includes('.'));
      return figureQuestions.some(q => matchedQuestions.has(q));
    });
  }, [searchResults, figures]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSimilarityChange = (e) => {
    setMinSimilarity(parseFloat(e.target.value));
  };

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Show results section when there's a search query
  const showResults = searchQuery.trim();

  return (
    <>
      <div className="semantic-search-compact" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ marginBottom: '0px' }}>
          <input
            type="text"
            placeholder="Search by research questions"
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '250px',
              padding: '5px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '11px',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {!searchQuery.trim() && (
          <p style={{
            fontSize: '12px',
            color: '#ccc',
            margin: '0',
            textAlign: 'center',
            padding: '12px',
            backgroundColor: '#fafafa',
            borderRadius: '4px',
            border: '1px solid #e8e8e8'
          }}>
            Type to search for similar questions
          </p>
        )}
      </div>

      {showResults && (
        <div style={{ position: 'relative', zIndex: 5 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid #e0e0e0'
          }}>
            <div>
              <h4 style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#333',
                margin: '0 0 4px 0'
              }}>
                Search Results
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#999',
                margin: '0'
              }}>
                {matchedFigures.length} figure{matchedFigures.length !== 1 ? 's' : ''} with matching question{searchResults.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={clearSearch}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#ff6b6b',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#ee5a52'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ff6b6b'}
            >
              Clear
            </button>
          </div>

          {matchedFigures.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              {matchedFigures.map((fig) => (
                <FigureCard
                  key={fig.guid}
                  figure={fig}
                  showCodes={showCodes}
                  onImageClick={() => onImageClick && onImageClick(fig)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fafafa',
              padding: '32px 16px',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#999',
                margin: '0'
              }}>
                No figures found with matching questions
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
