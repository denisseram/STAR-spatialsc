import React, { useState, useMemo, useRef, useEffect } from "react";

export default function FigureGrid({ figures = [] }) {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [showConnections, setShowConnections] = useState(true);
  const [buttonPositions, setButtonPositions] = useState({});
  const containerRef = useRef(null);
  const buttonRefs = useRef({});

  // Deduplicate codes (guard against missing `codes` arrays)
  const uniqueCodes = [...new Set(figures.flatMap((f) => f.codes || []))];

  // Group codes Titulo -> Padre -> Children
  const groupedCodes = {};
  const miscCodes = [];

  uniqueCodes.forEach((code) => {
    const parts = code.split(".");
    
    if (parts.length === 3) {
      const [titulo, padre, hijo] = parts;
      if (!groupedCodes[titulo]) groupedCodes[titulo] = {};
      if (!groupedCodes[titulo][padre]) groupedCodes[titulo][padre] = new Set();
      groupedCodes[titulo][padre].add(hijo);
    } else if (parts.length === 2) {
      const [titulo, padre] = parts;
      if (!groupedCodes[titulo]) groupedCodes[titulo] = {};
      if (!groupedCodes[titulo][padre]) groupedCodes[titulo][padre] = new Set();
    } else {
      miscCodes.push(code);
    }
  });

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

  const filteredFigures =
    selectedCodes.length === 0
      ? figures
      : figures.filter((fig) => 
          selectedCodes.every((selectedCode) => (fig.codes || []).includes(selectedCode))
        );

  const availableCodes = new Set();
  if (selectedCodes.length === 0) {
    uniqueCodes.forEach(code => availableCodes.add(code));
  } else {
    uniqueCodes.forEach((code) => {
      if (selectedCodes.includes(code)) {
        availableCodes.add(code);
      } else {
        const testSelection = [...selectedCodes, code];
        const wouldHaveResults = figures.some((fig) =>
          testSelection.every((selectedCode) => (fig.codes || []).includes(selectedCode))
        );
        if (wouldHaveResults) {
          availableCodes.add(code);
        }
      }
    });
  }

  // Calculate button positions
  useEffect(() => {
    const updatePositions = () => {
      const positions = {};
      Object.keys(buttonRefs.current).forEach(code => {
        const button = buttonRefs.current[code];
        if (button && containerRef.current) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          positions[code] = {
            x: buttonRect.left - containerRect.left + buttonRect.width / 2,
            y: buttonRect.top - containerRect.top + buttonRect.height / 2,
            width: buttonRect.width,
            height: buttonRect.height
          };
        }
      });
      setButtonPositions(positions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [groupedCodes, miscCodes]);

  // Generate connections between codes that appear together
  const connections = useMemo(() => {
    const relevantFigures = filteredFigures.length > 0 ? filteredFigures : figures;
    const links = [];
    const connectionCounts = new Map();

    relevantFigures.forEach(fig => {
      const codes = fig.codes || [];
      // Create connections between all pairs of codes in the same figure
      for (let i = 0; i < codes.length; i++) {
        for (let j = i + 1; j < codes.length; j++) {
          const code1 = codes[i];
          const code2 = codes[j];
          const key = [code1, code2].sort().join('|||');
          connectionCounts.set(key, (connectionCounts.get(key) || 0) + 1);
        }
      }
    });

    connectionCounts.forEach((count, key) => {
      const [code1, code2] = key.split('|||');
      if (buttonPositions[code1] && buttonPositions[code2]) {
        links.push({
          source: code1,
          target: code2,
          value: count
        });
      }
    });

    return links;
  }, [filteredFigures, figures, buttonPositions]);

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
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Sticky top bar */}
      <header style={{
        position: "sticky",
        top: 0,
        backgroundColor: "#2c3e50",
        color: "white",
        padding: "1rem 2rem",
        zIndex: 100,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Spatial Transcriptomics Survey</h1>
        <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>
          {totalPapers} papers · {totalFigures} figures
        </p>
      </header>

      {/* Filter section */}
      <div style={{
        backgroundColor: "white",
        padding: "1.5rem 2rem",
        borderBottom: "1px solid #e0e0e0"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "1rem"
        }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Filter by Codes</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setShowConnections(!showConnections)} style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              {showConnections ? "Hide" : "Show"} Connections
            </button>
            <button onClick={selectAll} style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              Select All
            </button>
            <button onClick={clearAll} style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              Clear
            </button>
          </div>
        </div>

        {/* Code buttons with SVG connections overlay */}
        <div ref={containerRef} style={{ position: "relative" }}>
          {/* SVG overlay for connections */}
          {showConnections && (
            <svg style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1
            }}>
              {connections.map((link, idx) => {
                const source = buttonPositions[link.source];
                const target = buttonPositions[link.target];
                if (!source || !target) return null;

                const maxValue = Math.max(...connections.map(c => c.value));
                const opacity = 0.1 + (link.value / maxValue) * 0.4;
                const strokeWidth = 1 + (link.value / maxValue) * 3;

                return (
                  <line
                    key={idx}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#3498db"
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                  />
                );
              })}
            </svg>
          )}

          {/* Code buttons in horizontal layout */}
          <div style={{ display: "flex", gap: "2rem", overflowX: "auto", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
            {Object.entries(groupedCodes).map(([titulo, padres]) => (
              <div key={titulo} style={{ minWidth: "200px", flex: "0 0 auto" }}>
                <div style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  marginBottom: "0.8rem",
                  color: "#2c3e50",
                  borderBottom: "2px solid #3498db",
                  paddingBottom: "0.3rem"
                }}>
                  {titulo}
                </div>
                {Object.entries(padres).map(([padre, hijos]) => (
                  <div key={`${titulo}.${padre}`} style={{ marginBottom: "1.5rem" }}>
                    <div style={{
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem",
                      color: "#34495e"
                    }}>
                      {padre}
                    </div>
                    {hijos.size > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {Array.from(hijos).map((hijo) => {
                          const fullCode = `${titulo}.${padre}.${hijo}`;
                          const active = selectedCodes.includes(fullCode);
                          const disabled = !availableCodes.has(fullCode);
                          return (
                            <button
                              key={fullCode}
                              ref={el => buttonRefs.current[fullCode] = el}
                              onClick={() => !disabled && toggleCode(fullCode)}
                              disabled={disabled}
                              style={{
                                padding: "0.4rem 0.8rem",
                                fontSize: "0.85rem",
                                border: active ? "2px solid #3498db" : "1px solid #bdc3c7",
                                borderRadius: "4px",
                                backgroundColor: active ? "#3498db" : disabled ? "#ecf0f1" : "white",
                                color: active ? "white" : disabled ? "#95a5a6" : "#2c3e50",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.5 : 1,
                                transition: "all 0.2s",
                                textAlign: "left",
                                width: "100%"
                              }}
                            >
                              {hijo}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {miscCodes.length > 0 && (
              <div style={{ minWidth: "200px", flex: "0 0 auto" }}>
                <div style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  marginBottom: "0.8rem",
                  color: "#2c3e50",
                  borderBottom: "2px solid #3498db",
                  paddingBottom: "0.3rem"
                }}>
                  Miscellaneous
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {miscCodes.map((code) => {
                    const active = selectedCodes.includes(code);
                    const disabled = !availableCodes.has(code);
                    return (
                      <button
                        key={code}
                        ref={el => buttonRefs.current[code] = el}
                        onClick={() => !disabled && toggleCode(code)}
                        disabled={disabled}
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                          border: active ? "2px solid #3498db" : "1px solid #bdc3c7",
                          borderRadius: "4px",
                          backgroundColor: active ? "#3498db" : disabled ? "#ecf0f1" : "white",
                          color: active ? "white" : disabled ? "#95a5a6" : "#2c3e50",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.5 : 1,
                          textAlign: "left",
                          width: "100%"
                        }}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main style={{ padding: "2rem" }}>
        <div style={{
          backgroundColor: "white",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "1rem", color: "#34495e" }}>
            Showing <strong>{filteredFigures.length}</strong> of{" "}
            <strong>{figures.length}</strong> figures
            {showConnections && connections.length > 0 && (
              <span style={{ marginLeft: "1rem", color: "#7f8c8d" }}>
                · {connections.length} connections
              </span>
            )}
          </div>
        </div>

        {filteredFigures.length === 0 ? (
          <div style={{
            backgroundColor: "white",
            padding: "3rem",
            borderRadius: "8px",
            textAlign: "center",
            color: "#7f8c8d"
          }}>
            No figures match the selected codes.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem"
          }}>
            {filteredFigures.map((fig) => (
              <div key={fig.guid} style={{
                backgroundColor: "white",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer"
              }}>
                <div style={{ position: "relative", paddingTop: "75%", backgroundColor: "#f8f9fa" }}>
                  <img
                    src={fig.imagePath}
                    alt={fig.name}
                    onClick={() =>
                      setModal({ 
                        src: fig.imagePath, 
                        title: fig.name,
                        citation: fig.citation,
                        paperTitle: fig.paperTitle,
                        paperUrl: fig.paperUrl
                      })
                    }
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain"
                    }}
                  />
                </div>
                <div style={{ padding: "1rem" }}>
                  {fig.citation && (
                    <div style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      color: "#2c3e50"
                    }} dangerouslySetInnerHTML={{
                      __html: fig.citation.replace(/et al\./g, '<em>et al.</em>')
                    }} />
                  )}
                  
                  {fig.paperTitle && (
                    <div style={{
                      fontSize: "0.85rem",
                      color: "#7f8c8d",
                      marginBottom: "0.8rem"
                    }}>
                      {fig.paperTitle}
                    </div>
                  )}
                  
                  {!fig.citation && (
                    <>
                      <div style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        marginBottom: "0.3rem"
                      }}>
                        {fig.name}
                      </div>
                      <div style={{
                        fontSize: "0.85rem",
                        color: "#7f8c8d",
                        marginBottom: "0.8rem"
                      }}>
                        {fig.sourceName}
                      </div>
                    </>
                  )}
                  
                  <div style={{ marginBottom: "0.8rem" }}>
                    {(() => {
                      const grouped = {};
                      (fig.codes || []).forEach((code) => {
                        const { father, child } = parseFatherChild(code);
                        if (!grouped[father]) grouped[father] = [];
                        if (child) grouped[father].push(child);
                      });

                      return Object.entries(grouped).map(([father, children]) => (
                        <div key={father} style={{ marginBottom: "0.5rem" }}>
                          <div style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#3498db",
                            marginBottom: "0.2rem"
                          }}>
                            {father}
                          </div>
                          {children.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                              {children.map((child) => (
                                <span key={child} style={{
                                  fontSize: "0.7rem",
                                  padding: "0.2rem 0.5rem",
                                  backgroundColor: "#ecf0f1",
                                  borderRadius: "3px",
                                  color: "#34495e"
                                }}>
                                  {child}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                  
                  {fig.paperUrl && (
                    <a 
                      href={fig.paperUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "0.5rem 1rem",
                        backgroundColor: "#3498db",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        transition: "background-color 0.2s"
                      }}
                    >
                      Link
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "2rem"
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: "white",
            borderRadius: "8px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <div style={{
              padding: "1rem 1.5rem",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ fontSize: "1rem", fontWeight: "600" }}>
                {modal.citation && (
                  <span dangerouslySetInnerHTML={{
                    __html: modal.citation.replace(/et al\./g, '<em>et al.</em>')
                  }} />
                )}
                {modal.paperTitle && ` - ${modal.paperTitle}`}
              </div>
              <button onClick={() => setModal(null)} style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#7f8c8d"
              }}>
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem" }}>
              <img src={modal.src} alt={modal.title} style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain"
              }} />
            </div>
            {modal.paperUrl && (
              <div style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid #e0e0e0"
              }}>
                <a 
                  href={modal.paperUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#3498db",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "4px"
                  }}
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