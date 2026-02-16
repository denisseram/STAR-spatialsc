import React from "react";

/**
 * CodeButton - Reusable button for code selection
 * @param {string} code - The code label to display
 * @param {boolean} isActive - Whether the button is currently selected
 * @param {boolean} isDisabled - Whether the button is disabled
 * @param {function} onClick - Click handler
 * @param {boolean} isSmall - Use smaller styling
 * @param {boolean} isGrandchild - Use grandchild-specific styling
 */
export default function CodeButton({
  code,
  isActive = false,
  isDisabled = false,
  onClick,
  isSmall = false,
  isGrandchild = false
}) {
  return (
    <button
      className={`code-button ${isSmall ? "small" : ""} ${isGrandchild ? "grandchild" : ""} ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isActive}
      type="button"
    >
      {code}
    </button>
  );
}
