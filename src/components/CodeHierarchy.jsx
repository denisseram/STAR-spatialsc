import React from "react";
import CodeButton from "./CodeButton.jsx";

/**
 * CodeHierarchy - Display and manage hierarchical code selection
 * @param {Object} groupedCodes - Organized codes by hierarchy
 * @param {Array} miscCodes - Miscellaneous codes without proper hierarchy
 * @param {Array} selectedCodes - Currently selected codes
 * @param {Set} availableCodes - Codes that have matching figures
 * @param {Function} onToggleCode - Handler for code selection
 */
export default function CodeHierarchy({
  groupedCodes,
  miscCodes,
  selectedCodes,
  availableCodes,
  onToggleCode
}) {
  return (
    <>
      {Object.entries(groupedCodes).map(([titulo, padres]) => (
        <div key={titulo} className="code-group">
          <div className="code-titulo-title">{titulo}</div>
          
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
                        code={hijo}
                        isActive={selectedCodes.includes(fullCode)}
                        isDisabled={!availableCodes.has(fullCode)}
                        onClick={() => onToggleCode(fullCode)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Hierarchical children with grandchildren */}
              {!(hijos instanceof Set) &&
                Object.entries(hijos).map(([hijo, grandchildren]) => {
                  const parentCode = `${titulo}.${padre}.${hijo}`;
                  const isParentSelected = selectedCodes.includes(parentCode);
                  
                  return (
                    <div key={parentCode} className="code-hijo-group">
                      <CodeButton
                        code={hijo}
                        isActive={isParentSelected}
                        isDisabled={!availableCodes.has(parentCode)}
                        onClick={() => onToggleCode(parentCode)}
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
                              onClick={() => onToggleCode(fullCode)}
                              isSmall
                              isGrandchild={true}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      ))}

      {/* Miscellaneous codes */}
      {miscCodes.length > 0 && (
        <div className="code-group">
          <div className="code-father-title">Miscellaneous</div>
          <div className="code-buttons">
            {miscCodes.map((code) => (
              <CodeButton
                key={code}
                code={code}
                isActive={selectedCodes.includes(code)}
                isDisabled={!availableCodes.has(code)}
                onClick={() => onToggleCode(code)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
