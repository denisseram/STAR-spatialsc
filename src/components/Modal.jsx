import React, { useRef } from "react";
import { formatEtAl, formatDisplayCitation } from "../utils/citationUtils.js";
import { groupDisplayCodes, getCategoryColor } from "../utils/codeUtils.js";
import useFocusTrap from "../hooks/useFocusTrap.js";

/**
 * Modal - Figure detail dialog: full-size image, paper info, and the
 * complete classification metadata for the figure (every code, grouped by
 * category), so the summarized tags on the card never hide information.
 * @param {object|null} modal - { figure } to show, or null to hide
 * @param {function} onClose - Handler to close modal
 */
export default function Modal({ modal, onClose }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, Boolean(modal), onClose);

  if (!modal) return null;

  const { figure } = modal;
  const displayCitation = formatDisplayCitation({
    citation: figure.citation,
    sourceName: figure.sourceName,
    year: figure.year
  });
  const { main: codeGroups, single: questionCodes } = groupDisplayCodes(figure.codes);

  // Group main codes by top-level category for the metadata list.
  const byCategory = codeGroups.reduce((acc, item) => {
    const key = item.titulo || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" id="modal-title">
            {displayCitation && (
              <span dangerouslySetInnerHTML={{ __html: formatEtAl(displayCitation) }} />
            )}
            {figure.paperTitle && ` - ${figure.paperTitle}`}
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close figure detail"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-body">
            <img src={figure.imagePath} alt={figure.name} className="modal-image" />
          </div>

          <div className="modal-metadata">
            <h3 className="modal-metadata-heading">Classification metadata</h3>

            {questionCodes.length > 0 && (
              <div className="modal-metadata-section">
                <div className="modal-metadata-section-title">Research question</div>
                <ul className="modal-question-list">
                  {questionCodes.map((q) => (
                    <li key={q.code}>{q.text}</li>
                  ))}
                </ul>
              </div>
            )}

            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category} className="modal-metadata-section">
                <div
                  className="modal-metadata-section-title"
                  style={{ color: `rgb(${getCategoryColor(category) || "107,114,128"})` }}
                >
                  {category}
                </div>
                <ul className="modal-code-list">
                  {items.map((item) => (
                    <li key={item.code}>{item.text}</li>
                  ))}
                </ul>
              </div>
            ))}

            {codeGroups.length === 0 && questionCodes.length === 0 && (
              <p className="modal-metadata-empty">No classification metadata available for this figure.</p>
            )}
          </div>
        </div>

        {figure.paperUrl && (
          <div className="modal-footer">
            <a
              href={figure.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-link-button"
            >
              View paper
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
