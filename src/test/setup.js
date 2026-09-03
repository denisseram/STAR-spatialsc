import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia; FigureGrid uses it to close the
// mobile filter drawer when the viewport grows past the desktop breakpoint.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  });
}

// jsdom doesn't implement canvas; the sidebar's WordCloud uses a throwaway
// canvas purely to measure text width for its D3 layout.
HTMLCanvasElement.prototype.getContext = () => ({
  font: "",
  measureText: (text) => ({ width: (text?.length || 0) * 8 })
});
