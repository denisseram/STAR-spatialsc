import React from "react";
import CodeButton from "./CodeButton.jsx";
import { getCategoryColor, getContextualLabel } from "../utils/codeUtils.js";
import { CATEGORY_ORDER } from "../utils/constants.js";

/**
 * CodeHierarchy - Display and manage hierarchical code selection, organized
 * as collapsible accordion sections (one per top-level category).
 * @param {Object} groupedCodes - Organized codes by hierarchy
 * @param {Array} miscCodes - Miscellaneous codes without proper hierarchy
 * @param {Array} selectedCodes - Currently selected codes
 * @param {Set} availableCodes - Codes that have matching figures
 * @param {Map} codeCounts - Map of code -> number of matching figures
 * @param {Function} onToggleCode - Handler for code selection
 */
export default function CodeHierarchy({
  groupedCodes,
  miscCodes,
  selectedCodes,
  availableCodes,
  codeCounts,
  onToggleCode
}) {
  // Separate and sort grouped codes
  const sortedEntries = Object.entries(groupedCodes).sort(([keyA], [keyB]) => {
    const indexA = CATEGORY_ORDER.indexOf(keyA);
    const indexB = CATEGORY_ORDER.indexOf(keyB);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return keyA.localeCompare(keyB);
  });

  const countSelectedIn = (codes) => codes.filter((c) => selectedCodes.includes(c)).length;

  const collectCategoryCodes = (padres) =>
    Object.entries(padres).flatMap(([padre, hijos]) => {
      if (hijos instanceof Set) {
        return Array.from(hijos).map((hijo) => `${padre}.${hijo}`);
      }
      return Object.entries(hijos).flatMap(([hijo, grandchildren]) => [
        `${padre}.${hijo}`,
        ...Array.from(grandchildren).map((gc) => `${padre}.${hijo}.${gc}`)
      ]);
    });

  return (
    <>
      {sortedEntries.map(([titulo, padres]) => {
        const categoryCodes = collectCategoryCodes(padres).map((suffix) => `${titulo}.${suffix}`);
        const selectedCount = countSelectedIn(categoryCodes);

        return (
          <details key={titulo} className="code-accordion" open>
            <summary
              className="code-accordion-summary"
              style={{ color: `rgb(${getCategoryColor(titulo)})` }}
            >
              <span className="code-accordion-title">{titulo}</span>
              {selectedCount > 0 && (
                <span className="code-accordion-badge">{selectedCount} selected</span>
              )}
              <svg className="code-accordion-chevron" aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
                <path fill="currentColor" d="M5 7l5 6 5-6H5Z" />
              </svg>
            </summary>

            <div className="code-accordion-body">
              {Object.entries(padres).map(([padre, hijos]) => (
                <div key={`${titulo}.${padre}`} className="code-padre-group">
                  <div className="code-padre-title">{padre}</div>

                  {/* Simple children (no grandchildren) */}
                  {hijos instanceof Set && hijos.size > 0 && (
                    <div className="code-buttons">
                      {Array.from(hijos).map((hijo) => {
                        const fullCode = `${titulo}.${padre}.${hijo}`;
                        return (
                          <CodeButton
                            key={fullCode}
                            code={getContextualLabel(padre, hijo)}
                            isActive={selectedCodes.includes(fullCode)}
                            isDisabled={!availableCodes.has(fullCode)}
                            count={codeCounts?.get(fullCode) ?? null}
                            onClick={() => onToggleCode(fullCode)}
                            categoryColor={getCategoryColor(titulo)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Object-mode padre: some hijos have grandchildren, others
                      don't (e.g. "Spatial Coordinates" has grandchildren,
                      its siblings "Time"/"Statistic"/etc. don't). Only the
                      ones that actually have grandchildren need their own
                      indented block - the rest flow together in one row so
                      they don't each waste a full line. */}
                  {!(hijos instanceof Set) &&
                    (() => {
                      const entries = Object.entries(hijos);
                      const flatHijos = entries.filter(([, gc]) => !gc || gc.size === 0);
                      const nestedHijos = entries.filter(([, gc]) => gc && gc.size > 0);

                      return (
                        <>
                          {nestedHijos.map(([hijo, grandchildren]) => {
                            const parentCode = `${titulo}.${padre}.${hijo}`;
                            const isParentSelected = selectedCodes.includes(parentCode);

                            return (
                              <div key={parentCode} className="code-hijo-group">
                                <CodeButton
                                  code={getContextualLabel(padre, hijo)}
                                  isActive={isParentSelected}
                                  isDisabled={!availableCodes.has(parentCode)}
                                  count={codeCounts?.get(parentCode) ?? null}
                                  onClick={() => onToggleCode(parentCode)}
                                  categoryColor={getCategoryColor(titulo)}
                                />
                                <div className="code-grandchildren-buttons">
                                  {Array.from(grandchildren).map((grandchild) => {
                                    const fullCode = `${parentCode}.${grandchild}`;
                                    return (
                                      <CodeButton
                                        key={fullCode}
                                        code={grandchild}
                                        isActive={selectedCodes.includes(fullCode)}
                                        isDisabled={!availableCodes.has(fullCode)}
                                        count={codeCounts?.get(fullCode) ?? null}
                                        onClick={() => onToggleCode(fullCode)}
                                        isSmall
                                        isGrandchild={true}
                                        categoryColor={getCategoryColor(titulo)}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {flatHijos.length > 0 && (
                            <div className="code-buttons">
                              {flatHijos.map(([hijo]) => {
                                const fullCode = `${titulo}.${padre}.${hijo}`;
                                return (
                                  <CodeButton
                                    key={fullCode}
                                    code={getContextualLabel(padre, hijo)}
                                    isActive={selectedCodes.includes(fullCode)}
                                    isDisabled={!availableCodes.has(fullCode)}
                                    count={codeCounts?.get(fullCode) ?? null}
                                    onClick={() => onToggleCode(fullCode)}
                                    categoryColor={getCategoryColor(titulo)}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                </div>
              ))}
            </div>
          </details>
        );
      })}

      {/* Miscellaneous codes */}
      {miscCodes.length > 0 && (
        <details className="code-accordion" open>
          <summary className="code-accordion-summary">
            <span className="code-accordion-title">Miscellaneous</span>
            {countSelectedIn(miscCodes) > 0 && (
              <span className="code-accordion-badge">{countSelectedIn(miscCodes)} selected</span>
            )}
            <svg className="code-accordion-chevron" aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
              <path fill="currentColor" d="M5 7l5 6 5-6H5Z" />
            </svg>
          </summary>
          <div className="code-accordion-body">
            <div className="code-buttons">
              {miscCodes.map((code) => (
                <CodeButton
                  key={code}
                  code={code}
                  isActive={selectedCodes.includes(code)}
                  isDisabled={!availableCodes.has(code)}
                  count={codeCounts?.get(code) ?? null}
                  onClick={() => onToggleCode(code)}
                />
              ))}
            </div>
          </div>
        </details>
      )}
    </>
  );
}
