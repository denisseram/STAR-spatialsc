import React from "react";

export default function CodeButton({ code, label, active, disabled, toggleCode, small }) {
  return (
    <button
      key={code}
      className={`code-button ${small ? "small" : ""} ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={() => !disabled && toggleCode(code)}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
