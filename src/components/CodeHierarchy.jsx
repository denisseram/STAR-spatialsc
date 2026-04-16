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
  // Color mapping for categories
  const categoryColors = {
    "Data": "188,68,40",           // Orange-brown
    "Task": "232,169,58",          // Yellow-orange
    "Visualization": "39,132,96"  // Blue
  };

  const getCategoryColor = (titulo) => {
    return categoryColors[titulo] || null;
  };

  // Define the order of categories to display
  const categoryOrder = ["Data", "Task", "Visualization"];
  
  // Separate and sort grouped codes
  const sortedEntries = Object.entries(groupedCodes).sort(([keyA], [keyB]) => {
    const indexA = categoryOrder.indexOf(keyA);
    const indexB = categoryOrder.indexOf(keyB);
    
    // If both are in the order list, sort by their index
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only A is in the order list, it comes first
    if (indexA !== -1) return -1;
    // If only B is in the order list, it comes first
    if (indexB !== -1) return 1;
    // If neither are in the order list, maintain alphabetical order
    return keyA.localeCompare(keyB);
  });

  return (
    <>
      {sortedEntries.map(([titulo, padres]) => (
        <div key={titulo} className="code-group">
          <div 
            className="code-titulo-title"
            style={{
              color: `rgb(${getCategoryColor(titulo)})`,
              borderBottomColor: `rgb(${getCategoryColor(titulo)})`
            }}
          >
            {titulo}
          </div>
          
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
                        categoryColor={getCategoryColor(titulo)}
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
