import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import StatsBar from "./StatsBar.jsx";
import FiguresGrid from "./FiguresGrid.jsx";
import Modal from "./Modal.jsx";
import "../styles/FigureGrid.css";

export default function FigureGrid({ figures = [] }) {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [modal, setModal] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const [filterMode, setFilterMode] = useState("AND");

  // --- utility functions (can move to utils.js if you want) ---
  const toggleCode = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const clearAll = () => setSelectedCodes([]);

  const filteredFigures =
    selectedCodes.length === 0
      ? figures
      : figures.filter((fig) =>
          filterMode === "AND"
            ? selectedCodes.every((c) => (fig.codes || []).includes(c))
            : selectedCodes.some((c) => (fig.codes || []).includes(c))
        );

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="topbar-title">Spatial Transcriptomics Survey</h1>
        <p className="topbar-subtitle">
          {new Set(figures.map((f) => f.sourceGuid)).size} papers · {figures.length} figures
        </p>
      </header>

      <div className="container">
        <Sidebar
          figures={figures}
          selectedCodes={selectedCodes}
          setSelectedCodes={setSelectedCodes}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          toggleCode={toggleCode}
          clearAll={clearAll}
        />

        <main className="main-content">
          <StatsBar
            total={figures.length}
            filtered={filteredFigures.length}
            showCodes={showCodes}
            setShowCodes={setShowCodes}
          />
          <FiguresGrid
            figures={filteredFigures}
            showCodes={showCodes}
            setModal={setModal}
          />
        </main>
      </div>

      {modal && <Modal modal={modal} setModal={setModal} />}
    </div>
  );
}
