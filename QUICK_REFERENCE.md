# Quick Reference - Modular Code Guide

## Finding Code

### I want to change how figures are filtered
→ `src/utils/filterUtils.js` + `src/hooks/useFiltering.js`

### I want to modify code parsing logic
→ `src/utils/codeUtils.js`

### I want to change citation formatting
→ `src/utils/citationUtils.js`

### I want to style a component
→ `src/styles/FigureGrid.css` (all styles here)

### I want to add a new constant
→ `src/utils/constants.js`

### I want to change word cloud behavior
→ `src/utils/wordCloudUtils.js` + `src/components/WordCloud.jsx`

### I want to modify the main page data loading
→ `src/lib/dataLoader.js` + `src/pages/index.astro`

## Component Hierarchy

```
FigureGrid (main)
  ├── CodeHierarchy (displays all filters)
  │   └── CodeButton (individual buttons)
  ├── WordCloud (statistics visualization)
  ├── FigureCard (individual figure display)
  │   └── uses citationUtils for formatting
  └── Modal (enlarged figure view)
```

## Hook Usage

```javascript
// Get code organization
const { grouped, misc, single } = useCodeHierarchy(figures);

// Handle selection with hierarchy
const { selectedCodes, toggleCode } = useCodeSelection(groupedCodes);

// Batch operations
const { selectAll, clearAll } = useCodeBatchOperations(...);

// Filter and available codes
const { filteredFigures, availableCodes } = useFiltering(
  figures, 
  selectedCodes, 
  filterMode
);

// Statistics
const stats = useStats(figures);
```

## Common Tasks

### Add a new figure metadata field

1. In `src/lib/dataLoader.js`, add to `extractFigureData()`:
```javascript
return {
  // ... existing fields
  newField: source?.newField || null,
};
```

2. In `src/components/FigureCard.jsx`, display it:
```jsx
{figure.newField && (
  <div className="figure-newfield">{figure.newField}</div>
)}
```

### Create a new filter mode

1. Add to `src/utils/constants.js`:
```javascript
export const FILTER_MODES = {
  AND: "AND",
  OR: "OR",
  XOR: "XOR"  // NEW
};
```

2. Implement logic in `src/utils/filterUtils.js`:
```javascript
if (filterMode === FILTER_MODES.XOR) {
  // XOR logic here
}
```

3. Add UI button in `FigureGrid.jsx`:
```jsx
<button 
  onClick={() => setFilterMode(FILTER_MODES.XOR)}
>
  XOR
</button>
```

### Modify word cloud appearance

Edit `src/utils/constants.js`:
```javascript
export const WORD_CLOUD_CONFIG = {
  MAX_WORDS: 50,        // More words
  FONT_SIZE_MIN: 12,    // Smaller minimum
  FONT_SIZE_MAX: 60,    // Larger maximum
  CANVAS_WIDTH: 400,    // Wider canvas
  // ...
};
```

## Data Flow

```
Astro Build Time:
  dataLoader.js loads JSON → extracts figures → passes to component

React Runtime:
  FigureGrid receives figures → useCodeHierarchy organizes codes
  → User selects codes → useCodeSelection manages state
  → useFiltering produces filtered results
  → Components render with filtered data
```

## Testing Utilities

All utilities are pure functions:

```javascript
import { formatDisplayCitation } from "../utils/citationUtils.js";
import { filterFigures } from "../utils/filterUtils.js";
import { parseCode } from "../utils/codeUtils.js";

// Test directly without React
const result = parseCode("A.B.C");
const filtered = filterFigures(figures, codes, "AND");
const citation = formatDisplayCitation({ citation: "Smith et al." });
```

## Performance Notes

- `useCodeHierarchy` - Runs once per figures change
- `useFiltering` - Runs when selection or filter mode changes
- `useCodeSelection` - Runs on code click
- Word cloud - Recomputes on filtered figures change

All use `useMemo` to prevent unnecessary recalculations.

## Debugging Tips

1. **Check component imports** - All utilities and hooks are named exports
2. **Console.log in utilities** - Pure functions are easy to debug
3. **Check constants first** - Most config is there
4. **Trace hook calls** - React DevTools shows hook state
5. **Check CSS classes** - All styling in FigureGrid.css

## File Size Reference

- `FigureGrid.jsx` - Was 814 lines, now ~100 lines ✅
- `utils/` - ~400 lines total (organized by domain)
- `hooks/` - ~100 lines total (focused logic)
- `components/` - ~50 lines each (single responsibility)

Total code is similar, but much better organized!
