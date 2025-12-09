import React from "react";

export default function FigureCard({ fig, showCodes, setModal }) {
  return (
    <div className="figure-card">
      <div className="figure-image-wrap">
        <img
          src={fig.imagePath}
          alt={fig.name}
          className="figure-image"
          onClick={() =>
            setModal({
              src: fig.imagePath,
              title: fig.name,
              citation: fig.citation,
              paperTitle: fig.paperTitle,
              paperUrl: fig.paperUrl
            })
          }
        />
      </div>
      <div className="figure-info">
        {fig.citation && (
          <div
            className="figure-citation"
            dangerouslySetInnerHTML={{
              __html: fig.citation.replace(/et al\./g, "<em>et al.</em>")
            }}
          />
        )}
        {fig.paperTitle && <div className="figure-paper-title">{fig.paperTitle}</div>}
        {!fig.citation && (
          <>
            <div className="figure-title">{fig.name}</div>
            <div className="figure-source">{fig.sourceName}</div>
          </>
        )}
        {showCodes && fig.codes && (
          <div className="figure-codes">
            {fig.codes.map((c) => (
              <span key={c} className="code-child">{c}</span>
            ))}
          </div>
        )}
        {fig.paperUrl && (
          <div className="paper-link-container">
            <a href={fig.paperUrl} target="_blank" rel="noopener noreferrer" className="paper-link-button">
              Link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
