import { useCallback, useState } from "react";
import { CODE_LEVELS } from "../utils/constants.js";

/**
 * Custom hook for managing code selection with hierarchy support
 * Handles automatic parent/child selection logic
 */
export const useCodeSelection = (groupedCodes) => {
  const [selectedCodes, setSelectedCodes] = useState([]);

  const toggleCode = useCallback((code) => {
    setSelectedCodes((prev) => {
      const parts = code.split(".");
      
      // Check if this is a child code that has grandchildren
      if (parts.length === CODE_LEVELS.TRIPLE) {
        const [titulo, padre, hijo] = parts;
        const hasGrandchildren = groupedCodes[titulo]?.[padre]?.[hijo] instanceof Set && 
                                 groupedCodes[titulo][padre][hijo].size > 0;
        
        if (hasGrandchildren) {
          const grandchildCodes = Array.from(groupedCodes[titulo][padre][hijo]).map(gc => `${code}.${gc}`);
          const isParentSelected = prev.includes(code);
          
          if (isParentSelected) {
            // Deselect parent and all grandchildren
            return prev.filter(c => c !== code && !grandchildCodes.includes(c));
          } else {
            // Select parent and all grandchildren
            return [...prev, code, ...grandchildCodes.filter(gc => !prev.includes(gc))];
          }
        }
      }
      
      // Check if this is a grandchild and its parent is selected
      if (parts.length === CODE_LEVELS.QUADRUPLE) {
        const parentCode = parts.slice(0, 3).join(".");
        const isGrandchildSelected = prev.includes(code);
        
        if (isGrandchildSelected) {
          // Deselecting a grandchild also deselects the parent
          return prev.filter(c => c !== code && c !== parentCode);
        } else {
          // Selecting a grandchild - check if all siblings would be selected
          const [titulo, padre, hijo] = parentCode.split(".");
          const allGrandchildren = Array.from(groupedCodes[titulo][padre][hijo] || new Set());
          const grandchildCodes = allGrandchildren.map(gc => `${parentCode}.${gc}`);
          
          // Add this grandchild
          const newSelection = [...prev, code];
          
          // If all grandchildren are now selected, also select the parent
          const allSelected = grandchildCodes.every(gc => newSelection.includes(gc));
          if (allSelected && !newSelection.includes(parentCode)) {
            return [...newSelection, parentCode];
          }
          
          return newSelection;
        }
      }
      
      // Default toggle behavior for other codes
      return prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
    });
  }, [groupedCodes]);

  return { selectedCodes, setSelectedCodes, toggleCode };
};

/**
 * Custom hook for batch code selection operations
 */
export const useCodeBatchOperations = (groupedCodes, miscCodes, setSelectedCodes) => {
  const selectAll = useCallback(() => {
    const allCodes = [
      ...Object.entries(groupedCodes).flatMap(([titulo, padres]) =>
        Object.entries(padres).flatMap(([padre, hijos]) =>
          Array.from(hijos).map((hijo) => `${titulo}.${padre}.${hijo}`)
        )
      ),
      ...miscCodes
    ];
    setSelectedCodes(allCodes);
  }, [groupedCodes, miscCodes, setSelectedCodes]);

  const clearAll = useCallback(() => setSelectedCodes([]), [setSelectedCodes]);

  return { selectAll, clearAll };
};
