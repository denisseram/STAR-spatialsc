import React, { useMemo } from "react";
import { parseCode } from "../utils/codeUtils.js";
import { filterOutHiddenCodes } from "../utils/filterUtils.js";
import { formatDisplayCitation, formatEtAl } from "../utils/citationUtils.js";

/**
 * FigureCard - Display a single figure with metadata and codes
 * @param {object} figure - Figure data object
 * @param {boolean} showCodes - Whether to display code information
 * @param {function} onImageClick - Handler for image click
 */
export default function FigureCard({ figure, showCodes, onImageClick }) {
  const groupedCodes = useMemo(() => {
    const grouped = {};
    // Filter out hidden codes before grouping
    const visibleCodes = filterOutHiddenCodes(figure.codes || []);
    visibleCodes.forEach((code) => {
      const { father, child } = parseCode(code);
      if (!grouped[father]) grouped[father] = [];
      if (child) grouped[father].push(child);
    });
    return grouped;
  }, [figure.codes]);

  const displayCitation = useMemo(() => {
    return formatDisplayCitation({
      citation: figure.citation,
      sourceName: figure.sourceName,
      year: figure.year
    });
  }, [figure.citation, figure.sourceName, figure.year]);

  return (
    <div className="figure-card">
      <div className="figure-image-wrap">
        <img
          src={figure.imagePath}
          alt={figure.name}
          className="figure-image"
          onClick={onImageClick}
        />
      </div>
      
      <div className="figure-info">
        {displayCitation && (
          <div 
            className="figure-citation"
            dangerouslySetInnerHTML={{
              __html: formatEtAl(displayCitation)
            }}
          />
        )}
        
        {figure.paperTitle && (
          <div className="figure-paper-title">{figure.paperTitle}</div>
        )}
        
        {!displayCitation && (
          <>
            <div className="figure-title">{figure.name}</div>
            <div className="figure-source">{figure.sourceName}</div>
          </>
        )}
        
        {showCodes && (
          <div className="figure-codes">
            {Object.entries(groupedCodes).map(([father, children]) => (
              <div key={father} className="code-block">
                <div className="code-father">{father}</div>
                {children.length > 0 && (
                  <div className="code-children">
                    {children.map((child) => (
                      <span key={child} className="code-child">{child}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {figure.paperUrl && (
          <div className="paper-link-container">
            <a 
              href={figure.paperUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="paper-link-button"
            >
              Link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
