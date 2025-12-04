import React, { useState } from "react";
import "../styles/FigureGrid.css";

export default function FigureGrid({ figures = [] }) {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const [filterMode, setFilterMode] = useState("AND"); // "AND" or "OR"

  // Deduplicate codes (guard against missing `codes` arrays)
  const uniqueCodes = [...new Set(figures.flatMap((f) => f.codes || []))];

  // Group codes Titulo -> Padre -> Children
  const groupedCodes = {};
  const miscCodes = [];
  const singleLevelCodes = []; // Codes without dots (level 1)

  uniqueCodes.forEach((code) => {
    const parts = code.split(".");

    if (parts.length === 1) {
      // Single level code - add to word cloud array
      singleLevelCodes.push(code);
    } else if (parts.length === 4) {
      // titulo.padre.hijo.grandchild
      const [titulo, padre, hijo, grandchild] = parts;
      if (!groupedCodes[titulo]) groupedCodes[titulo] = {};
      if (!groupedCodes[titulo][padre]) groupedCodes[titulo][padre] = {};
      if (!groupedCodes[titulo][padre][hijo]) groupedCodes[titulo][padre][hijo] = new Set();
      groupedCodes[titulo][padre][hijo].add(grandchild);
    } else if (parts.length === 3) {
      // titulo.padre.hijo
      const [titulo, padre, hijo] = parts;
      if (!groupedCodes[titulo]) groupedCodes[titulo] = {};
      if (!groupedCodes[titulo][padre]) groupedCodes[titulo][padre] = new Set();
      groupedCodes[titulo][padre].add(hijo);
    } else if (parts.length === 2) {
      // titulo.padre
      const [titulo, padre] = parts;
      if (!groupedCodes[titulo]) groupedCodes[titulo] = {};
      if (!groupedCodes[titulo][padre]) groupedCodes[titulo][padre] = new Set();
    } else {
      miscCodes.push(code);
    }
  });

  //  Count papers (unique sources) and figures
  const totalFigures = figures.length;
  const totalPapers = new Set(figures.map((f) => f.sourceGuid)).size;

  const toggleCode = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    const all = [
      ...Object.entries(groupedCodes).flatMap(([titulo, padres]) =>
        Object.entries(padres).flatMap(([padre, hijos]) =>
          Array.from(hijos).map((hijo) => `${titulo}.${padre}.${hijo}`)
        )
      ),
      ...miscCodes,
    ];
    setSelectedCodes(all);
  };

  const clearAll = () => setSelectedCodes([]);

  // If no codes are selected, show all figures. Otherwise filter based on filterMode
  const filteredFigures =
    selectedCodes.length === 0
      ? figures
      : figures.filter((fig) => 
          filterMode === "AND"
            ? selectedCodes.every((selectedCode) => (fig.codes || []).includes(selectedCode))
            : selectedCodes.some((selectedCode) => (fig.codes || []).includes(selectedCode))
        );

  // Determine which codes are available (would not result in zero matches)
  const availableCodes = new Set();
  if (selectedCodes.length === 0) {
    // If nothing is selected, all codes are available
    uniqueCodes.forEach(code => availableCodes.add(code));
  } else {
    // Check which codes would still yield results if added to current selection
    uniqueCodes.forEach((code) => {
      if (selectedCodes.includes(code)) {
        // Already selected codes are "available"
        availableCodes.add(code);
      } else {
        // Test if adding this code would yield any results
        const testSelection = [...selectedCodes, code];
        const wouldHaveResults = figures.some((fig) =>
          filterMode === "AND"
            ? testSelection.every((selectedCode) => (fig.codes || []).includes(selectedCode))
            : testSelection.some((selectedCode) => (fig.codes || []).includes(selectedCode))
        );
        if (wouldHaveResults) {
          availableCodes.add(code);
        }
      }
    });
  }

  const parseFatherChild = (code) => {
    const parts = code.split(".");
    if (parts.length === 3) {
      return { 
        father: parts[1] || "Unknown", 
        child: parts[2] || "" 
      };
    } else if (parts.length === 2) {
      return { 
        father: parts[0] || "Unknown", 
        child: parts[1] || "" 
      };
    }
    return { 
      father: parts[0] || "Unknown", 
      child: "" 
    };
  };

  return (
    <div className="page">
      {/* Sticky top bar */}
      <header className="topbar">
        <h1 className="topbar-title">Spatial Transcriptomics Survey</h1>
        <p className="topbar-subtitle">
          {totalPapers} papers · {totalFigures} figures
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

          {/* Grouped Titulo -> Padre -> Hijo codes */}
          {Object.entries(groupedCodes).map(([titulo, padres]) => (
            <div key={titulo} className="code-group">
              <div className="code-titulo-title">{titulo}</div>
              {Object.entries(padres).map(([padre, hijos]) => (
                <div key={`${titulo}.${padre}`} className="code-padre-group">
                  <div className="code-padre-title">{padre}</div>

                  {/* Case: hijos is a Set (normal 3-level) */}
                  {hijos instanceof Set && hijos.size > 0 && (
                    <div className="code-buttons">
                      {Array.from(hijos).map((hijo) => {
                        const fullCode = `${titulo}.${padre}.${hijo}`;
                        const active = selectedCodes.includes(fullCode);
                        const disabled = !availableCodes.has(fullCode);
                        return (
                          <button
                            key={fullCode}
                            className={`code-button ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                            onClick={() => !disabled && toggleCode(fullCode)}
                            disabled={disabled}
                          >
                            {hijo}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Case: hijos is an object (4-level hierarchy) */}
                  {!(hijos instanceof Set) &&
                    Object.entries(hijos).map(([hijo, grandchildren]) => (
                      <div key={`${titulo}.${padre}.${hijo}`} className="code-hijo-group">
                        <div className="code-hijo-title">{hijo}</div>
                        <div className="code-grandchildren-buttons">
                          {Array.from(grandchildren).map((grandchild) => {
                            const fullCode = `${titulo}.${padre}.${hijo}.${grandchild}`;
                            const active = selectedCodes.includes(fullCode);
                            const disabled = !availableCodes.has(fullCode);
                            return (
                              <button
                                key={fullCode}
                                className={`code-button small ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                                onClick={() => !disabled && toggleCode(fullCode)}
                                disabled={disabled}
                              >
                                {grandchild}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}


          {/* Miscellaneous codes */}
          {miscCodes.length > 0 && (
            <div className="code-group">
              <div className="code-father-title">Miscellaneous</div>
              <div className="code-buttons">
                {miscCodes.map((code) => {
                  const active = selectedCodes.includes(code);
                  const disabled = !availableCodes.has(code);
                  return (
                    <button
                      key={code}
                      className={`code-button ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                      onClick={() => !disabled && toggleCode(code)}
                      disabled={disabled}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
                <div key={fig.guid} className="figure-card">
                  <div className="figure-image-wrap">
                    <img
                      src={fig.imagePath}
                      alt={fig.name}
                      className="figure-image"
                      onClick={() =>
                        setModal({ 
                          src: fig.imagePath, 
                          title: fig.name,
                          citation: fig.citation,
                          paperTitle: fig.paperTitle,
                          paperUrl: fig.paperUrl
                        })
                      }
                    />
                  </div>
                  <div className="figure-info">
                    {/* Citation */}
                    {fig.citation && (
                      <div 
                        className="figure-citation"
                        dangerouslySetInnerHTML={{
                          __html: fig.citation.replace(/et al\./g, '<em>et al.</em>')
                        }}
                      />
                    )}
                    
                    {/* Paper Title */}
                    {fig.paperTitle && (
                      <div className="figure-paper-title">{fig.paperTitle}</div>
                    )}
                    
                    {/* Original figure name and source (fallback if no bibliography) */}
                    {!fig.citation && (
                      <>
                        <div className="figure-title">{fig.name}</div>
                        <div className="figure-source">{fig.sourceName}</div>
                      </>
                    )}
                    
                    {/* Codes */}
                    {showCodes && (
                      <div className="figure-codes">
                          {(() => {
                              // Group codes by father
                              const grouped = {};
                              (fig.codes || []).forEach((code) => {
                              const { father, child } = parseFatherChild(code);
                              if (!grouped[father]) grouped[father] = [];
                              if (child) grouped[father].push(child);
                              });

                              return Object.entries(grouped).map(([father, children]) => (
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
                              ));
                          })()}
                      </div>
                    )}

                    
                    {/* Link Button */}
                    {fig.paperUrl && (
                      <div className="paper-link-container">
                        <a 
                          href={fig.paperUrl} 
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
              ))}
            </div>
          )}
        </main>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {modal.citation && (
                  <span 
                    dangerouslySetInnerHTML={{
                      __html: modal.citation.replace(/et al\./g, '<em>et al.</em>')
                    }}
                  />
                )}
                {modal.paperTitle && ` - ${modal.paperTitle}`}
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <img src={modal.src} alt={modal.title} className="modal-image" />
            </div>
            {modal.paperUrl && (
              <div className="modal-footer">
                <a 
                  href={modal.paperUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="modal-link-button"
                >
                  View Paper
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}