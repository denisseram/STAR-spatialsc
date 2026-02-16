# Code Architecture Diagram

## Component Tree

```
┌─────────────────────────────────────────────────────────┐
│                   index.astro                            │
│              (Clean Astro template)                      │
│                                                          │
│  Uses: dataLoader.js → extracts figure data             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
        ┌───────────────────────────────┐
        │   FigureGrid (React, main)    │
        │  ~100 lines (was 814)         │
        └───────────┬───────────────────┘
                    │
        ┌───────────┼───────────────────────┐
        │           │                       │
        ▼           ▼                       ▼
    ┌────────┐ ┌──────────┐ ┌────────────┐
    │ Sidebar│ │WordCloud │ │MainContent │
    └────────┘ └──────────┘ └────────────┘
        │           │              │
        ▼           │              ▼
   ┌──────────────┐ │      ┌──────────────┐
   │CodeHierarchy │ │      │ FigureCards  │
   │              │ │      │(Grid layout) │
   │ ┌──────────┐ │ │      │              │
   │ │CodeButton│ │ │      │ ┌──────────┐ │
   │ │(reused)  │ │ │      │ │FigureCard│ │
   │ └──────────┘ │ │      │ │component │ │
   └──────────────┘ │      │ └──────────┘ │
                    │      └──────────────┘
                    │              │
                    │              ▼
                    │      ┌──────────────┐
                    └─────▶│Modal Viewer  │
                           │(on click)    │
                           └──────────────┘
```

## Data Flow Architecture

```
BUILD TIME (Astro)
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  JSON Files in public/data/                             │
│  ├── content/quotations/*.json                          │
│  ├── content/codes/*.json                               │
│  └── content/sources/*.json                             │
│                                                          │
│  ▼ src/lib/dataLoader.js                               │
│  ├── loadQuotations()  ────┐                            │
│  ├── loadCodeMap()     ────┤─▶ extractFigureData()     │
│  ├── loadSourceMap()   ────┘                            │
│  └── normalizeBaseUrl()                                 │
│                                                          │
│  ▼ index.astro passes figuresData as prop              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
RUNTIME (React)
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  FigureGrid receives figures prop                       │
│                                                          │
│  ▼ useCodeHierarchy(figures)                           │
│  Organizes codes into hierarchy structure               │
│                                                          │
│  ▼ useCodeSelection(groupedCodes)                      │
│  Manages which codes are selected                       │
│                                                          │
│  ▼ useFiltering(figures, selected, mode)               │
│  Produces filtered results                              │
│                                                          │
│  ▼ Components render filtered data                     │
│  ├── CodeHierarchy displays filters                    │
│  ├── WordCloud shows statistics                        │
│  └── FigureCards display results                       │
│                                                          │
│  ▼ User interaction                                    │
│  └── Hooks update state, triggers re-render            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
┌─ constants.js ◀─────────────────────────────┐
│                                              │
│  (Used by all utilities and components)     │
│                                              │
└──────────────────────────────────────────────┘

┌─ codeUtils.js ◀──────────────────────┐
│  (Code organization)                  │
│                                       │
│  Used by: hooks, WordCloud component  │
└───────────────────────────────────────┘

┌─ filterUtils.js ◀──────────────────┐
│  (Figure filtering)                │
│                                    │
│  Used by: useFiltering hook        │
└────────────────────────────────────┘

┌─ citationUtils.js ◀──────────────────────┐
│  (Citation formatting)                    │
│                                          │
│  Used by: FigureCard, Modal components   │
└──────────────────────────────────────────┘

┌─ wordCloudUtils.js ◀─────────────────┐
│  (Word cloud algorithms)               │
│                                       │
│  Used by: WordCloud component         │
└───────────────────────────────────────┘

┌─ dataLoader.js ◀────────────────────┐
│  (Data loading)                      │
│                                     │
│  Used by: index.astro page          │
└──────────────────────────────────────┘

CUSTOM HOOKS:
┌─ useCodeSelection.js ◀──────────────┐
│  (Selection state)                   │
│                                     │
│  Used by: FigureGrid component      │
└──────────────────────────────────────┘

┌─ useFiltering.js ◀──────────────────┐
│  (Filtering & stats)                │
│                                     │
│  Used by: FigureGrid component      │
└──────────────────────────────────────┘

COMPONENTS:
┌─ FigureGrid.jsx (main)              │
├─ CodeHierarchy.jsx                  │
├─ CodeButton.jsx                     │
├─ FigureCard.jsx                     │
├─ Modal.jsx                          │
└─ WordCloud.jsx
```

## File Organization Principle

```
WHAT?                    WHERE?              WHY?
──────────────────────────────────────────────────
Business Logic    →  src/utils/         Pure functions
State Management  →  src/hooks/         Reusable logic
UI Display        →  src/components/    React components
Configuration     →  src/utils/constants.js  One place
Data Loading      →  src/lib/dataLoader.js   Build-time
Styling           →  src/styles/        CSS files
Page Templates    →  src/pages/         Astro routes
```

## Dependency Injection Pattern

```
index.astro
  │
  ├─▶ Load data (dataLoader.js)
  │
  └─▶ FigureGrid
       │
       ├─▶ Pass figures prop
       │
       ├─▶ useCodeHierarchy(figures)
       │   ├─▶ uses codeUtils.js
       │   └─▶ uses constants.js
       │
       ├─▶ useFiltering(figures, ...)
       │   ├─▶ uses filterUtils.js
       │   └─▶ uses constants.js
       │
       └─▶ Render Components
           ├─▶ CodeHierarchy
           │   └─▶ CodeButton (reused)
           ├─▶ WordCloud
           │   └─▶ wordCloudUtils.js
           ├─▶ FigureCard
           │   └─▶ citationUtils.js
           └─▶ Modal
               └─▶ citationUtils.js

Result: Clear data flow, easy to trace, testable!
```

## State Management Flow

```
User clicks code button
        │
        ▼
toggleCode() in useCodeSelection hook
        │
        ▼
setSelectedCodes(newSelection)
        │
        ▼
FigureGrid component re-renders
        │
        ├─▶ useFiltering() recalculates
        │   ├─▶ filterFigures(figures, selected, mode)
        │   └─▶ calculateAvailableCodes(...)
        │
        └─▶ Components render new state
            ├─▶ CodeButton shows active state
            ├─▶ FigureCard updates display
            └─▶ WordCloud recalculates if needed

No global state management needed! ✅
All state is local and derived from props
```

## Scalability Pattern

```
Want to add feature X?

1. Check if logic belongs in:
   ├─ src/utils/  (pure functions)
   ├─ src/hooks/  (state management)
   ├─ src/components/ (UI)
   └─ src/utils/constants.js (config)

2. Keep components focused:
   ├─ Presentation logic only
   └─ Use utilities for business logic

3. Keep utilities pure:
   ├─ No React hooks
   ├─ No side effects
   └─ Easy to test

4. Keep hooks focused:
   ├─ State management only
   ├─ Use utilities for logic
   └─ Easy to reuse

Result: Consistent structure, easy to scale!
```
