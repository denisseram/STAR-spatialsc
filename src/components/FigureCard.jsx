import React, { useMemo } from "react";
import { filterOutHiddenCodes } from "../utils/filterUtils.js";
import { formatDisplayCitation, formatEtAl } from "../utils/citationUtils.js";

/**
 * FigureCard - Display a single figure with metadata and codes
 * @param {object} figure - Figure data object
 * @param {boolean} showCodes - Whether to display code information
 * @param {function} onImageClick - Handler for image click
 */
export default function FigureCard({ figure, showCodes, onImageClick }) {
  const categoryColors = {
    /**
    "Data": { text: "188,68,40", bg: "207,156,145" },
    "Task": { text: "232,169,58", bg: "255,232,168" },
    "Visualization": { text: "39,132,96", bg: "143,194,174" }
    */
    "Data": { text: "58,58,58", bg: "211,211,211" },
    "Task": { text: "58,58,58", bg: "211,211,211" },
    "Visualization": { text: "58,58,58", bg: "211,211,211" }
  };

  const getCategoryColor = (titulo) => {
    return categoryColors[titulo] || { text: "107,114,128", bg: "229,231,235" }; // gray by default
  };

  const groupedCodes = useMemo(() => {
    const codesList = [];
    const singleCodes = [];
    // Filter out hidden codes before grouping
    const visibleCodes = filterOutHiddenCodes(figure.codes || []);
    visibleCodes.forEach((code) => {
      const parts = code.split(".");
      let displayText = "";
      let titulo = "";
      
      if (parts.length === 3) {
        // Format: 1.2.3 -> "2 : 3"
        titulo = parts[0];
        displayText = `${parts[1]} : ${parts[2]}`;
      } else if (parts.length === 4) {
        // Format: 1.2.3.4 -> "2 : 3 : 4"
        titulo = parts[0];
        displayText = `${parts[1]} : ${parts[2]} : ${parts[3]}`;
      } else if (parts.length === 2) {
        // Format: 1.2 -> "2"
        titulo = parts[0];
        displayText = parts[1];
      } else if (parts.length === 1) {
        // Codes without dots - white background with black text
        singleCodes.push({
          text: code,
          titulo: "",
          colors: { text: "0,0,0", bg: "255,255,255" }
        });
        return;
      }
      
      codesList.push({
        text: displayText,
        titulo: titulo,
        colors: getCategoryColor(titulo)
      });
    });
    return { main: codesList, single: singleCodes };
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
          <div>
            <div className="figure-codes">
              {groupedCodes.main.map((codeObj, index) => (
                <div 
                  key={index} 
                  className="code-button"
                  style={{
                    color: `rgb(${codeObj.colors.text})`,
                    backgroundColor: `rgb(${codeObj.colors.bg})`,
                    borderColor: `rgb(${codeObj.colors.text})`
                  }}
                >
                  {codeObj.text}
                </div>
              ))}
            </div>
            {groupedCodes.single.length > 0 && (
              <div className="figure-codes-single">
                <div className="single-codes-label"></div>
                <div className="single-codes-list">
                  {groupedCodes.single.map((codeObj, index) => (
                    <div 
                      key={`single-${index}`} 
                      className="code-button code-button-single"
                      style={{
                        color: `rgb(${codeObj.colors.text})`,
                        backgroundColor: `rgb(${codeObj.colors.bg})`,
                        borderColor: `rgb(${codeObj.colors.text})`
                      }}
                    >
                      {codeObj.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
