import React from "react";

/**
 * Switch - Accessible toggle switch used for every boolean control in the
 * app, so on/off state always looks and behaves the same way.
 * @param {string} id - Unique id for the underlying checkbox
 * @param {boolean} checked - Current on/off state
 * @param {function} onChange - Change handler
 * @param {string} label - Accessible + visible label text
 * @param {string} [description] - Optional helper text shown under the label
 */
export default function Switch({ id, checked, onChange, label, description }) {
  return (
    <label className="switch-control" htmlFor={id}>
      <span className="switch-control-text">
        <span className="switch-control-label">{label}</span>
        {description && (
          <span className="switch-control-description">{description}</span>
        )}
      </span>
      <span className="switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
        />
        <span className="slider" aria-hidden="true">
          <span className="slider-state" aria-hidden="true">
            {checked ? "On" : "Off"}
          </span>
        </span>
      </span>
    </label>
  );
}
