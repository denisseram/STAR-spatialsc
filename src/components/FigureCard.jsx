import React, { useMemo } from "react";
import { groupDisplayCodes } from "../utils/codeUtils.js";
import { formatDisplayCitation, formatEtAl } from "../utils/citationUtils.js";
import { CATEGORY_ORDER } from "../utils/constants.js";

/**
 * FigureCard - Summary card for one figure: preview, paper context,
 * the figure's full set of classification attributes (ordered Data ->
 * Task -> Visualization) laid out as a compact two-column grid, the
 * research question last, and explicit actions.
 * @param {object} figure - Figure data object
 * @param {boolean} showCodes - Whether to display classification attributes
 * @param {function} onOpenDetail - Opens the figure detail modal
 */
export default function FigureCard({ figure, showCodes, onOpenDetail }) {
  const { main: attributes, single: questionCodes } = useMemo(
    () => groupDisplayCodes(figure.codes || []),
    [figure.codes]
  );

  const orderedAttributes = useMemo(() => {
    return [...attributes].sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a.titulo);
      const indexB = CATEGORY_ORDER.indexOf(b.titulo);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  }, [attributes]);

  const displayCitation = useMemo(() => {
    return formatDisplayCitation({
      citation: figure.citation,
      sourceName: figure.sourceName,
      year: figure.year
    });
  }, [figure.citation, figure.sourceName, figure.year]);

  const imageAlt = figure.paperTitle
    ? `Figure from "${figure.paperTitle}"`
    : figure.name || "Figure preview";

  return (
    <article className="figure-card">
      <div className="figure-image-wrap">
        <button
          type="button"
          className="figure-image-button"
          onClick={() => onOpenDetail(figure)}
          aria-label={`Open figure${figure.paperTitle ? ` from ${figure.paperTitle}` : ""}`}
        >
          <img src={figure.imagePath} alt={imageAlt} className="figure-image" loading="lazy" />
        </button>
      </div>

      <div className="figure-info">
        {displayCitation && (
          <div
            className="figure-citation"
            dangerouslySetInnerHTML={{ __html: formatEtAl(displayCitation) }}
          />
        )}

        {figure.paperTitle ? (
          <h3 className="figure-paper-title" title={figure.paperTitle}>
            {figure.paperTitle}
          </h3>
        ) : (
          !displayCitation && <div className="figure-title">{figure.name}</div>
        )}

        {showCodes && orderedAttributes.length > 0 && (
          <div className="figure-codes-grid">
            {orderedAttributes.map((attr) => (
              <span
                key={attr.code}
                className="attribute-tag"
                title={attr.text}
                style={attr.color ? { borderColor: `rgb(${attr.color})` } : undefined}
              >
                {attr.text}
              </span>
            ))}
          </div>
        )}

        {questionCodes.length > 0 && (
          <div className="figure-attributes">
            {questionCodes.map((q) => (
              <span key={q.code} className="attribute-tag attribute-tag-question" title={q.text}>
                {q.text}
              </span>
            ))}
          </div>
        )}

        <div className="figure-actions">
          <button type="button" className="figure-action-primary" onClick={() => onOpenDetail(figure)}>
            Open figure
          </button>
          {figure.paperUrl && (
            <a
              href={figure.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="figure-action-secondary"
            >
              View paper
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
