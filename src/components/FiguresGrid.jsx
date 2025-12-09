import React from "react";
import FigureCard from "./FigureCard.jsx";

export default function FiguresGrid({ figures, showCodes, setModal }) {
  if (figures.length === 0) {
    return <div className="no-results">No figures match the selected codes.</div>;
  }

  return (
    <div className="figures-grid">
      {figures.map((fig) => (
        <FigureCard key={fig.guid} fig={fig} showCodes={showCodes} setModal={setModal} />
      ))}
    </div>
  );
}
