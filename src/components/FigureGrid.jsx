import React, { useState, useMemo, useCallback } from "react";
import "../styles/FigureGrid.css";

const FILTER_MODES = {
  AND: "AND",
  OR: "OR"
};

const CODE_LEVELS = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  QUADRUPLE: 4
};

const parseCode = (code) => {
  const parts = code.split(".");
  
  if (parts.length === CODE_LEVELS.TRIPLE) {
    return { 
      father: parts[1] || "Unknown", 
      child: parts[2] || "" 
    };
  }
  
  if (parts.length === CODE_LEVELS.DOUBLE) {
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

const groupCodesByHierarchy = (codes) => {
  const grouped = {};
  const misc = [];
  const single = [];

  codes.forEach((code) => {
    const parts = code.split(".");
    const length = parts.length;

    if (length === CODE_LEVELS.SINGLE) {
      single.push(code);
      return;
    }

    if (length === CODE_LEVELS.QUADRUPLE) {
      const [titulo, padre, hijo, grandchild] = parts;
      if (!grouped[titulo]) grouped[titulo] = {};
      if (!grouped[titulo][padre]) {
        // Initialize as object to hold children which may be either Sets or objects
        grouped[titulo][padre] = {};
      }
      if (!grouped[titulo][padre][hijo]) grouped[titulo][padre][hijo] = new Set();
      grouped[titulo][padre][hijo].add(grandchild);
      return;
    }

    if (length === CODE_LEVELS.TRIPLE) {
      const [titulo, padre, hijo] = parts;
      if (!grouped[titulo]) grouped[titulo] = {};
      if (!grouped[titulo][padre]) {
        grouped[titulo][padre] = new Set();
      }
      // If padre is already an object (from QUADRUPLE codes), convert or skip
      if (grouped[titulo][padre] instanceof Set) {
        grouped[titulo][padre].add(hijo);
      } else {
        // Already has grandchildren, so this hijo should be an object too
        if (!grouped[titulo][padre][hijo]) {
          grouped[titulo][padre][hijo] = new Set();
        }
      }
      return;
    }

    if (length === CODE_LEVELS.DOUBLE) {
      const [titulo, padre] = parts;
      if (!grouped[titulo]) grouped[titulo] = {};
      if (!grouped[titulo][padre]) grouped[titulo][padre] = new Set();
      return;
    }

    misc.push(code);
  });

  return { grouped, misc, single };
};

const filterFigures = (figures, selectedCodes, filterMode) => {
  if (selectedCodes.length === 0) return figures;

  return figures.filter((fig) => {
    const figCodes = fig.codes || [];
    
    if (filterMode === FILTER_MODES.AND) {
      return selectedCodes.every((code) => figCodes.includes(code));
    }
    
    return selectedCodes.some((code) => figCodes.includes(code));
  });
};

const calculateAvailableCodes = (figures, uniqueCodes, selectedCodes, filterMode) => {
  const available = new Set();

  if (selectedCodes.length === 0) {
    uniqueCodes.forEach(code => available.add(code));
    return available;
  }

  uniqueCodes.forEach((code) => {
    if (selectedCodes.includes(code)) {
      available.add(code);
      return;
    }

    const testSelection = [...selectedCodes, code];
    const hasResults = figures.some((fig) => {
      const figCodes = fig.codes || [];
      
      if (filterMode === FILTER_MODES.AND) {
        return testSelection.every((selectedCode) => figCodes.includes(selectedCode));
      }
      
      return testSelection.some((selectedCode) => figCodes.includes(selectedCode));
    });

    if (hasResults) {
      available.add(code);
    }
  });

  return available;
};

// Sub-components
const CodeButton = ({ code, isActive, isDisabled, onClick, isSmall = false }) => (
  <button
    className={`code-button ${isSmall ? "small" : ""} ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
    onClick={onClick}
    disabled={isDisabled}
  >
    {code}
  </button>
);

const FigureCard = ({ figure, showCodes, onImageClick }) => {
  const groupedCodes = useMemo(() => {
    const grouped = {};
    (figure.codes || []).forEach((code) => {
      const { father, child } = parseCode(code);
      if (!grouped[father]) grouped[father] = [];
      if (child) grouped[father].push(child);
    });
    return grouped;
  }, [figure.codes]);

  // Extract author from sourceName if citation is not available or is just a year
  const displayCitation = useMemo(() => {
    if (figure.citation && figure.citation.length > 4 && !figure.citation.match(/^\d{4}$/)) {
      return figure.citation;
    }
    // Extract author from sourceName (format: "Author - Year - Title.pdf")
    if (figure.sourceName) {
      const match = figure.sourceName.match(/^(.+?)\s*-\s*\d{4}/);
      if (match) {
        const author = match[1].trim();
        return figure.year ? `${author} - ${figure.year}` : author;
      }
    }
    return figure.citation || null;
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
              __html: displayCitation.replace(/et al\./g, '<em>et al.</em>')
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
};

const Modal = ({ modal, onClose }) => {
  if (!modal) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
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
          <button className="modal-close" onClick={onClose}>✕</button>
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
  );
};

// Main component
export default function FigureGrid({ figures = [] }) {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const [filterMode, setFilterMode] = useState(FILTER_MODES.AND);

  // Memoized calculations
  const uniqueCodes = useMemo(
    () => [...new Set(figures.flatMap((f) => f.codes || []))],
    [figures]
  );

  const { grouped: groupedCodes, misc: miscCodes, single: singleLevelCodes } = useMemo(
    () => groupCodesByHierarchy(uniqueCodes),
    [uniqueCodes]
  );

  const stats = useMemo(() => ({
    totalFigures: figures.length,
    totalPapers: new Set(figures.map((f) => f.sourceGuid)).size
  }), [figures]);

  const filteredFigures = useMemo(
    () => filterFigures(figures, selectedCodes, filterMode),
    [figures, selectedCodes, filterMode]
  );

  const availableCodes = useMemo(
    () => calculateAvailableCodes(figures, uniqueCodes, selectedCodes, filterMode),
    [figures, uniqueCodes, selectedCodes, filterMode]
  );

  // Event handlers
  const toggleCode = useCallback((code) => {
    setSelectedCodes((prev) => {
      // Check if this is a child code that has grandchildren
      const parts = code.split(".");
      if (parts.length === CODE_LEVELS.TRIPLE) {
        const [titulo, padre, hijo] = parts;
        const hasGrandchildren = groupedCodes[titulo]?.[padre]?.[hijo] instanceof Set === false;
        
        if (hasGrandchildren) {
          const grandchildren = Object.keys(groupedCodes[titulo][padre][hijo] || {});
          const grandchildCodes = grandchildren.map(gc => `${code}.${gc}`);
          
          // Check if parent is currently selected
          const isParentSelected = prev.includes(code);
          
          if (isParentSelected) {
            // Deselect parent and all grandchildren
            return prev.filter(c => c !== code && !grandchildCodes.includes(c));
          } else {
            // Select parent and all grandchildren
            return [...prev, code, ...grandchildCodes.filter(gc => !prev.includes(gc))];
          }
        }
      }
      
      // Check if this is a grandchild and its parent is selected
      if (parts.length === CODE_LEVELS.QUADRUPLE) {
        const parentCode = parts.slice(0, 3).join(".");
        const isGrandchildSelected = prev.includes(code);
        
        if (isGrandchildSelected) {
          // Deselecting a grandchild also deselects the parent
          return prev.filter(c => c !== code && c !== parentCode);
        } else {
          // Selecting a grandchild adds it but keeps parent deselected
          return [...prev, code];
        }
      }
      
      // Default toggle behavior for other codes
      return prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
    });
  }, [groupedCodes]);

  const selectAll = useCallback(() => {
    const allCodes = [
      ...Object.entries(groupedCodes).flatMap(([titulo, padres]) =>
        Object.entries(padres).flatMap(([padre, hijos]) =>
          Array.from(hijos).map((hijo) => `${titulo}.${padre}.${hijo}`)
        )
      ),
      ...miscCodes
    ];
    setSelectedCodes(allCodes);
  }, [groupedCodes, miscCodes]);

  const clearAll = useCallback(() => setSelectedCodes([]), []);

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

          {Object.entries(groupedCodes).map(([titulo, padres]) => (
            <div key={titulo} className="code-group">
              <div className="code-titulo-title">{titulo}</div>
              
              {Object.entries(padres).map(([padre, hijos]) => (
                <div key={`${titulo}.${padre}`} className="code-padre-group">
                  <div className="code-padre-title">{padre}</div>

                  {hijos instanceof Set && hijos.size > 0 && (
                    <div className="code-buttons">
                      {Array.from(hijos).map((hijo) => {
                        const fullCode = `${titulo}.${padre}.${hijo}`;
                        return (
                          <CodeButton
                            key={fullCode}
                            code={hijo}
                            isActive={selectedCodes.includes(fullCode)}
                            isDisabled={!availableCodes.has(fullCode)}
                            onClick={() => toggleCode(fullCode)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {!(hijos instanceof Set) &&
                    Object.entries(hijos).map(([hijo, grandchildren]) => {
                      const parentCode = `${titulo}.${padre}.${hijo}`;
                      const isParentSelected = selectedCodes.includes(parentCode);
                      
                      return (
                        <div key={parentCode} className="code-hijo-group">
                          <CodeButton
                            code={hijo}
                            isActive={isParentSelected}
                            isDisabled={!availableCodes.has(parentCode)}
                            onClick={() => toggleCode(parentCode)}
                          />
                          <div className="code-grandchildren-buttons">
                            {Array.from(grandchildren).map((grandchild) => {
                              const fullCode = `${parentCode}.${grandchild}`;
                              return (
                                <CodeButton
                                  key={fullCode}
                                  code={grandchild}
                                  isActive={selectedCodes.includes(fullCode)}
                                  isDisabled={!availableCodes.has(fullCode)}
                                  onClick={() => toggleCode(fullCode)}
                                  isSmall
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}

          {miscCodes.length > 0 && (
            <div className="code-group">
              <div className="code-father-title">Miscellaneous</div>
              <div className="code-buttons">
                {miscCodes.map((code) => (
                  <CodeButton
                    key={code}
                    code={code}
                    isActive={selectedCodes.includes(code)}
                    isDisabled={!availableCodes.has(code)}
                    onClick={() => toggleCode(code)}
                  />
                ))}
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