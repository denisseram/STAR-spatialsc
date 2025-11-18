import React, { useState } from "react";
import "../styles/FigureGrid.css";

export default function FigureGrid({ figures }) {
  const [selectedCodes, setSelectedCodes] = useState(
    figures.flatMap((f) => f.codes)
  );
  const [modal, setModal] = useState(null);

  const allCodes = [...new Set(figures.flatMap((f) => f.codes))].sort();

  const toggleCode = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => setSelectedCodes(allCodes);
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
    <div className="container">
      <aside className="sidebar">
        <h2>Filtrar por códigos</h2>
        <div className="filter-controls">
          <button onClick={selectAll}>Seleccionar todo</button>
          <button onClick={clearAll}>Limpiar</button>
        </div>
        <div id="codeFilters">
          {allCodes.map((code) => (
            <div key={code} className="code-filter">
              <input
                type="checkbox"
                checked={selectedCodes.includes(code)}
                onChange={() => toggleCode(code)}
              />
              <label>{code}</label>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <div className="stats">
          <div className="stats-text">
            Mostrando <strong>{filteredFigures.length}</strong> de{" "}
            <strong>{figures.length}</strong> figuras
          </div>
        </div>

        {filteredFigures.length === 0 ? (
          <div className="no-results">
            No hay figuras que coincidan con los códigos seleccionados.
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
