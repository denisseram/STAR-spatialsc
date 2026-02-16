# Code Modularity Improvements - Documentation

## Overview

The codebase has been refactored to follow best practices, improved modularity, and better leverage Astro's capabilities. All existing functionality and styles remain unchanged.

## Project Structure

```
src/
├── components/          # React components for UI
│   ├── FigureGrid.jsx   # Main component (now refactored)
│   ├── FigureCard.jsx   # Individual figure card display
│   ├── CodeButton.jsx   # Reusable button component
│   ├── CodeHierarchy.jsx # Code filtering UI structure
│   ├── Modal.jsx        # Image modal viewer
│   └── WordCloud.jsx    # Word frequency visualization
├── hooks/              # Custom React hooks
│   ├── useCodeSelection.js  # Code selection state management
│   └── useFiltering.js      # Data filtering logic
├── utils/              # Shared utilities
│   ├── constants.js     # Application constants
│   ├── codeUtils.js     # Code parsing and hierarchy
│   ├── filterUtils.js   # Figure filtering logic
│   ├── citationUtils.js # Citation formatting
│   └── wordCloudUtils.js # Word cloud utilities
├── lib/
│   └── dataLoader.js    # Astro data loading (build-time)
├── layouts/
│   └── Layout.astro     # Main layout template
├── pages/
│   └── index.astro      # Homepage (refactored)
└── styles/
    └── FigureGrid.css   # Styles (unchanged)
```

## Key Improvements

### 1. **Modular Components**

Each component now has a single, clear responsibility:

- **`FigureCard.jsx`** - Displays individual figure with metadata
- **`CodeButton.jsx`** - Reusable button for code selection
- **`Modal.jsx`** - Image viewer modal
- **`WordCloud.jsx`** - Word frequency visualization
- **`CodeHierarchy.jsx`** - Code filtering UI structure

**Benefits:**
- Easier to test and maintain
- More reusable across the application
- Better separation of concerns

### 2. **Custom Hooks** (`src/hooks/`)

Business logic extracted into reusable hooks:

#### `useCodeSelection.js`
- `useCodeSelection()` - Manages code selection with hierarchy support
- `useCodeBatchOperations()` - Batch operations (Select All, Clear)

#### `useFiltering.js`
- `useCodeHierarchy()` - Organizes codes by hierarchy
- `useFiltering()` - Filters figures and calculates available codes
- `useStats()` - Computes basic statistics

**Benefits:**
- Easier to test business logic independently
- Reusable in other components
- Better state management organization

### 3. **Utility Modules** (`src/utils/`)

Pure functions organized by domain:

#### `constants.js`
- Centralized configuration constants
- Stop words list for word cloud
- Word cloud canvas settings

#### `codeUtils.js`
- `parseCode()` - Parse code hierarchy
- `groupCodesByHierarchy()` - Organize codes by level
- `getAllLeafCodes()` - Get all specific codes

#### `filterUtils.js`
- `filterFigures()` - Filter by AND/OR logic
- `calculateAvailableCodes()` - Determine selectable codes

#### `citationUtils.js`
- `extractAuthor()` - Extract author from filename
- `formatDisplayCitation()` - Format for display
- `formatEtAl()` - HTML formatting for "et al."

#### `wordCloudUtils.js`
- `analyzeWordFrequencies()` - Extract word data
- `calculateFontSize()` - Size scaling
- `generateWordColor()` - HSL color generation
- `checkCollision()` - Collision detection
- `findWordPlacement()` - Positioning algorithm

**Benefits:**
- Pure functions are easy to test
- Utilities can be used independently
- Better code organization
- Easy to locate specific functionality

### 4. **Astro Data Loader** (`src/lib/dataLoader.js`)

Dedicated module for build-time data loading:

```javascript
// These run at build time
loadQuotations()      // Load quotation files
loadCodeMap()         // Load and index codes
loadSourceMap()       // Load and index sources
extractFigureData()   // Process and combine data
normalizeBaseUrl()    // Handle URL formatting
```

**Benefits:**
- Cleaner `index.astro` template
- Reusable data loading logic
- Better error handling potential
- Separated concerns

### 5. **Improved Astro Templates**

**`src/pages/index.astro`** - Now much cleaner:
```astro
---
import { loadQuotations, ... } from "../lib/dataLoader.js";
const figuresData = extractFigureData(...);
---
<Layout>
  <FigureGrid client:load figures={figuresData} />
</Layout>
```

**`src/layouts/Layout.astro`** - Improved with:
- Proper meta tags
- Better semantic HTML
- Consistent styling

### 6. **Better Type Hints**

All functions have JSDoc comments explaining:
- Parameters and their types
- Return values
- Usage examples

Example:
```javascript
/**
 * Format citation for display
 * @param {{citation: string|null, sourceName: string, year: string|null}} metadata
 * @returns {string|null} Formatted citation string
 */
export const formatDisplayCitation = (metadata) => { ... }
```

## Usage Examples

### Adding a New Filter Type

1. Add logic to `src/utils/filterUtils.js`
2. Update hook in `src/hooks/useFiltering.js`
3. Update component UI in `FigureGrid.jsx`

No other files need changes!

### Creating a New Component

1. Create component file in `src/components/`
2. Import and use utilities from `src/utils/`
3. Import and use hooks from `src/hooks/`

Example:
```jsx
import { formatDisplayCitation } from "../utils/citationUtils.js";
import { useStats } from "../hooks/useFiltering.js";

export default function MyComponent({ figures }) {
  const stats = useStats(figures);
  // ...
}
```

### Testing Utilities

All utilities are pure functions and easy to test:

```javascript
import { parseCode } from "../utils/codeUtils.js";

test("parseCode works correctly", () => {
  const result = parseCode("Topic.Subtopic.Specific");
  expect(result.father).toBe("Subtopic");
  expect(result.child).toBe("Specific");
});
```

## Benefits Summary

✅ **Better Maintainability** - Each module has one job
✅ **Easier Testing** - Pure functions and isolated hooks
✅ **Code Reusability** - Share utilities across components
✅ **Scalability** - Easy to add new features
✅ **Better Organization** - Clear file structure
✅ **Documentation** - JSDoc comments throughout
✅ **Performance** - Unchanged, uses Astro efficiently
✅ **Styles Preserved** - All CSS remains identical

## Migration Notes

- All existing functionality works exactly the same
- No breaking changes to the API
- All styling is preserved
- Build process unchanged
- Performance characteristics maintained

## Future Improvements

Potential enhancements following this modular approach:

1. **Error Boundaries** - Wrap components with error handling
2. **Unit Tests** - Easy to test utility functions
3. **Type Safety** - Could add TypeScript
4. **i18n** - Language support in constants
5. **Themes** - Color themes in constants
6. **Analytics** - Easy to track in hooks

## File Dependencies

```
index.astro
  ├── dataLoader.js
  └── FigureGrid.jsx (client component)
      ├── FigureCard.jsx
      │   └── citationUtils.js
      ├── CodeButton.jsx
      ├── CodeHierarchy.jsx
      │   └── CodeButton.jsx
      ├── Modal.jsx
      │   └── citationUtils.js
      ├── WordCloud.jsx
      │   └── wordCloudUtils.js
      ├── useCodeSelection hook
      ├── useFiltering hook
      └── constants.js
```

Clear dependencies make debugging and refactoring easier!
