import React, { useState } from "react";
import "../styles/FigureGrid.css";

export default function FigureGrid({ figures }) {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [modal, setModal] = useState(null);

  // Group codes Father -> Children
  const groupedCodes = {};
  const miscCodes = [];

  figures.flatMap((f) => f.codes).forEach((code) => {
    if (code.includes(".")) {
      const [father, child] = code.split(".");
      if (!groupedCodes[father]) groupedCodes[father] = new Set();
      groupedCodes[father].add(child);
    } else {
      miscCodes.push(code);
    }
  });

  const toggleCode = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    const all = [
      ...Object.entries(groupedCodes).flatMap(([father, children]) =>
        Array.from(children).map((child) => `${father}.${child}`)
      ),
      ...miscCodes,
    ];
    setSelectedCodes(all);
  };

  const clearAll = () => setSelectedCodes([]);

  const filteredFigures = figures.filter((fig) =>
    fig.codes.some((code) => selectedCodes.includes(code))
  );

  const parseFatherChild = (code) => {
    const parts = code.split(".");
    const father = parts[0] || "Unknown";
    const child = parts.length > 1 ? parts.slice(1).join(".") : "";
    return { father, child };
  };

  return (
    <div className="page">
      {/* Top bar */}
      <header className="topbar">
        <h1 className="topbar-title">Spatial Transcriptomics Survey</h1>
        <p className="topbar-subtitle">
          {figures.length} papers ·{" "}
          {figures.reduce((acc, f) => acc + 1, 0)} figures
        </p>
      </header>

      <div className="container">
        <aside className="sidebar">
          <h2>Filter by Codes</h2>
          <div className="filter-controls">
            <button onClick={selectAll}>Select All</button>
            <button onClick={clearAll}>Clear</button>
          </div>

          {/* Grouped Father.Child codes */}
          {Object.entries(groupedCodes).map(([father, children]) => (
            <div key={father} className="code-group">
              <div className="code-father-title">{father}</div>
              <div className="code-buttons">
                {Array.from(children).map((child) => {
                  const fullCode = `${father}.${child}`;
                  const active = selectedCodes.includes(fullCode);
                  return (
                    <button
                      key={fullCode}
                      className={`code-button ${active ? "active" : ""}`}
                      onClick={() => toggleCode(fullCode)}
                    >
                      {child}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Miscellaneous codes */}
          {miscCodes.length > 0 && (
            <div className="code-group">
              <div className="code-father-title">Miscellaneous</div>
              <div className="code-buttons">
                {miscCodes.map((code) => {
                  const active = selectedCodes.includes(code);
                  return (
                    <button
                      key={code}
                      className={`code-button ${active ? "active" : ""}`}
                      onClick={() => toggleCode(code)}
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
                        setModal({ src: fig.imagePath, title: fig.name })
                      }
                    />
                  </div>
                  <div className="figure-info">
                    <div className="figure-title">{fig.name}</div>
                    <div className="figure-source">{fig.sourceName}</div>
                    <div className="figure-codes">
                      {fig.codes.map((code) => {
                        const { father, child } = parseFatherChild(code);
                        return (
                          <div key={code} className="code-block">
                            <div className="code-father">{father}</div>
                            {child && <div className="code-child">{child}</div>}
                          </div>
                        );
                      })}
                    </div>
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
              <div className="modal-title">{modal.title}</div>
              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <img src={modal.src} alt={modal.title} className="modal-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
