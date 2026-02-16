/**
 * Word cloud and text analysis utilities
 */

import { STOP_WORDS, WORD_CLOUD_CONFIG } from "./constants.js";

/**
 * Extract and analyze words from codes
 * @param {object[]} figures - Array of figure objects with codes
 * @returns {Array} Array of word frequency objects
 */
export const analyzeWordFrequencies = (figures) => {
  const frequency = {};
  
  if (!figures || !Array.isArray(figures)) {
    return [];
  }
  
  // Get all single-level codes (no dots) from the figures
  const singleLevelCodes = new Set();
  figures.forEach(figure => {
    (figure.codes || []).forEach(code => {
      if (!code.includes('.')) {
        singleLevelCodes.add(code);
      }
    });
  });
  
  // Analyze words in these codes
  singleLevelCodes.forEach(code => {
    // Split by spaces and punctuation, convert to lowercase
    const words = code.toLowerCase()
      .replace(/[?.,;:!()[\]{}]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
  });
  
  // Convert to array and sort by frequency
  return Object.entries(frequency)
    .map(([word, count]) => ({
      text: word,
      count: count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, WORD_CLOUD_CONFIG.MAX_WORDS);
};

/**
 * Calculate font size for a word based on frequency
 * @param {number} count - Word frequency count
 * @param {number} minCount - Minimum frequency in dataset
 * @param {number} maxCount - Maximum frequency in dataset
 * @returns {number} Font size in pixels
 */
export const calculateFontSize = (count, minCount, maxCount) => {
  const { FONT_SIZE_MIN, FONT_SIZE_MAX } = WORD_CLOUD_CONFIG;
  
  if (minCount === maxCount) {
    return FONT_SIZE_MAX;
  }
  
  return FONT_SIZE_MIN + ((count - minCount) / (maxCount - minCount)) * (FONT_SIZE_MAX - FONT_SIZE_MIN);
};

/**
 * Generate HSL color based on index (golden angle distribution)
 * @param {number} index - Word index
 * @param {number} count - Word frequency count
 * @param {number} maxCount - Maximum frequency in dataset
 * @returns {string} HSL color string
 */
export const generateWordColor = (index, count, maxCount) => {
  const hue = (index * 137.5) % 360; // Golden angle for color distribution
  const saturation = 60 + (count / maxCount) * 20;
  const lightness = 40 + (count / maxCount) * 10;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Check if word positioned collides with existing positions
 * @param {object} pos - New word position {x, y, width, height}
 * @param {Array} positions - Array of existing word positions
 * @returns {boolean} True if collision detected
 */
export const checkCollision = (pos, positions) => {
  const { PADDING } = WORD_CLOUD_CONFIG;
  
  return positions.some(existingPos => {
    return !(
      pos.x + pos.width < existingPos.x - PADDING ||
      pos.x > existingPos.x + existingPos.width + PADDING ||
      pos.y - pos.height > existingPos.y + PADDING ||
      pos.y < existingPos.y - existingPos.height - PADDING
    );
  });
};

/**
 * Find random placement for word, attempting to avoid collisions
 * @param {CanvasRenderingContext2D} ctx - Canvas context for text measurement
 * @param {object} word - Word object {text, fontSize}
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Array} positions - Existing word positions
 * @returns {object|null} Placement coordinates or null if cannot place
 */
export const findWordPlacement = (ctx, word, width, height, positions) => {
  const { PADDING, COLLISION_ATTEMPTS } = WORD_CLOUD_CONFIG;
  
  ctx.font = `bold ${word.fontSize}px Arial`;
  const metrics = ctx.measureText(word.text);
  const wordWidth = metrics.width;
  const wordHeight = word.fontSize;
  
  let attempts = 0;
  while (attempts < COLLISION_ATTEMPTS) {
    const x = Math.random() * (width - wordWidth - PADDING * 2) + PADDING;
    const y = Math.random() * (height - wordHeight - PADDING * 2) + PADDING + wordHeight;
    
    const newPos = { x, y, width: wordWidth, height: wordHeight };
    const hasCollision = checkCollision(newPos, positions);
    
    if (!hasCollision) {
      return { x, y };
    }
    
    attempts++;
  }
  
  return null;
};
