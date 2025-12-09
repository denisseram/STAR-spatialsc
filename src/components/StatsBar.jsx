import React from "react";

export default function StatsBar({ total, filtered, showCodes, setShowCodes }) {
  return (
    <div className="stats">
      <div className="stats-text">
        Showing <strong>{filtered}</strong> of <strong>{total}</strong> figures
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
  );
}
