import React from "react";
import { formatEtAl } from "../utils/citationUtils.js";

/**
 * Modal - Display enlarged figure with metadata
 * @param {object|null} modal - Modal state (null to hide)
 * @param {function} onClose - Handler to close modal
 */
export default function Modal({ modal, onClose }) {
  if (!modal) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {modal.citation && (
              <span 
                dangerouslySetInnerHTML={{
                  __html: formatEtAl(modal.citation)
                }}
              />
            )}
            {modal.paperTitle && ` - ${modal.paperTitle}`}
          </div>
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          <img src={modal.src} alt={modal.title} className="modal-image" />
        </div>
        
        {modal.paperUrl && (
          <div className="modal-footer">
            <a 
              href={modal.paperUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="modal-link-button"
            >
              View Paper
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
