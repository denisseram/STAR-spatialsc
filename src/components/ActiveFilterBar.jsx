import React from "react";
import { formatCodeLabel } from "../utils/codeUtils.js";

/**
 * ActiveFilterBar - Shows every active result-narrowing filter (selected
 * classification codes plus the two figure-visibility toggles) as
 * removable chips, above the results grid. Hidden entirely when nothing
 * is active. Visually distinct from the quiet metadata tags on cards.
 */
export default function ActiveFilterBar({
  selectedCodes,
  onRemoveCode,
  showInteractivityOnly,
  onRemoveInteractivityOnly,
  showHiddenByDefault,
  onRemoveHiddenByDefault,
  onClearAll
}) {
  const chips = [
    ...selectedCodes.map((code) => ({
      key: `code:${code}`,
      label: formatCodeLabel(code),
      onRemove: () => onRemoveCode(code)
    })),
    ...(showInteractivityOnly
      ? [{ key: "interactivity", label: "Interactive papers only", onRemove: onRemoveInteractivityOnly }]
      : []),
    ...(showHiddenByDefault
      ? [{ key: "hidden", label: "Including benchmarking/schematic figures", onRemove: onRemoveHiddenByDefault }]
      : [])
  ];

  if (chips.length === 0) return null;

  return (
    <div className="active-filter-bar" aria-label="Active filters">
      <span className="active-filter-bar-label">Active filters:</span>
      <ul className="active-filter-chips">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              className="active-filter-chip"
              onClick={chip.onRemove}
              aria-label={`Remove filter: ${chip.label}`}
            >
              <span aria-hidden="true">{chip.label}</span>
              <span className="active-filter-chip-remove" aria-hidden="true">
                ✕
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="active-filter-clear-all"
        onClick={onClearAll}
        aria-label="Clear all active filters"
      >
        Clear all
      </button>
    </div>
  );
}
