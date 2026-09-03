import React, { useRef } from "react";
import useFocusTrap from "../hooks/useFocusTrap.js";

/**
 * FilterDrawer - Mobile/narrow-viewport sheet that hosts the filter
 * sidebar contents. Traps focus, closes on Escape or backdrop click, and
 * restores focus to the trigger button on close.
 */
export default function FilterDrawer({ isOpen, onClose, children }) {
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="filter-drawer-backdrop" onClick={onClose}>
      <div
        className="filter-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="filter-drawer-header">
          <button
            type="button"
            className="filter-drawer-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>
        <div className="filter-drawer-body">{children}</div>
        <div className="filter-drawer-footer">
          <button type="button" className="filter-drawer-apply" onClick={onClose}>
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}
