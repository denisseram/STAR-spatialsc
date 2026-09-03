import React from "react";

/**
 * CodeButton - Reusable button for code selection
 * @param {string} code - The code label to display
 * @param {boolean} isActive - Whether the button is currently selected
 * @param {boolean} isDisabled - Whether the button is disabled
 * @param {function} onClick - Click handler
 * @param {boolean} isSmall - Use smaller styling
 * @param {boolean} isGrandchild - Use grandchild-specific styling
 * @param {string} categoryColor - RGB color for this category (e.g., "188,68,40")
 * @param {number} [count] - Number of matching figures, shown next to the label
 */
export default function CodeButton({
  code,
  isActive = false,
  isDisabled = false,
  onClick,
  isSmall = false,
  isGrandchild = false,
  categoryColor = null,
  count = null
}) {
  const getActiveStyle = () => {
    if (!isActive || !categoryColor) return {};
    return {
      backgroundColor: `rgb(${categoryColor})`,
      borderColor: `rgb(${categoryColor})`
    };
  };

  return (
    <button
      className={`code-button ${isSmall ? "small" : ""} ${isGrandchild ? "grandchild" : ""} ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isActive}
      title={isDisabled ? "No figures match this value together with your other selected filters" : undefined}
      type="button"
      style={getActiveStyle()}
    >
      {isActive && (
        <span className="code-button-check" aria-hidden="true">
          ✓
        </span>
      )}
      <span className="code-button-text">{code}</span>
      {count !== null && <span className="code-button-count"> ({count})</span>}
    </button>
  );
}
