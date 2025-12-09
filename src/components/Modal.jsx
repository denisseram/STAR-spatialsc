import React from "react";

export default function Modal({ modal, setModal }) {
  if (!modal) return null;

  return (
    <div className="modal-backdrop" onClick={() => setModal(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            {modal.citation && (
              <span
                dangerouslySetInnerHTML={{
                  __html: modal.citation.replace(/et al\./g, "<em>et al.</em>")
                }}
              />
            )}
            {modal.paperTitle && ` - ${modal.paperTitle}`}
          </div>
          <button className="modal-close" onClick={() => setModal(null)}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <img src={modal.src} alt={modal.title} className="modal-image" />
        </div>

        {/* Footer */}
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
