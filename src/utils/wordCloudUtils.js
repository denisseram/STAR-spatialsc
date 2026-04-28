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
 * Generate color from custom palette based on index
 * @param {number} index - Word index
 * @param {number} count - Word frequency count
 * @param {number} maxCount - Maximum frequency in dataset
 * @returns {string} Hex color string
 */
export const generateWordColor = (index, count, maxCount) => {
  const colors = ["#134074", "#13315c", "#0b2545", "#8da9c4", "#e0e1dd" ];
  return colors[index % colors.length];
};

/**
 * Check if a word bounding box collides with any existing positions
 * @param {number} x - Word x position
 * @param {number} y - Word y position
 * @param {number} width - Word width
 * @param {number} height - Word height
 * @param {Array} positions - Existing positioned words
 * @returns {boolean} True if collision detected
 */
const checkWordCollision = (x, y, width, height, positions) => {
  const padding = 8; // Extra padding around words
  
  return positions.some(pos => {
    // Calculate bounding boxes with padding
    const word1Left = x - width / 2 - padding;
    const word1Right = x + width / 2 + padding;
    const word1Top = y - height / 2 - padding;
    const word1Bottom = y + height / 2 + padding;
    
    const word2Left = pos.x - pos.width / 2 - padding;
    const word2Right = pos.x + pos.width / 2 + padding;
    const word2Top = pos.y - pos.height / 2 - padding;
    const word2Bottom = pos.y + pos.height / 2 + padding;
    
    // AABB (Axis-Aligned Bounding Box) collision detection
    return !(word1Right < word2Left || 
             word1Left > word2Right || 
             word1Bottom < word2Top || 
             word1Top > word2Bottom);
  });
};

/**
 * Compute word positions using an improved spiral layout algorithm
 * @param {object[]} words - Array of word objects with text, size, color, rotate
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @returns {object[]} Words with x, y coordinates
 */
export const computeWordPositions = (words, width, height) => {
  const { PADDING } = WORD_CLOUD_CONFIG;
  const positions = [];
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Create temporary canvas for text measurement
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  // Sort words by size (largest first) to place bigger words first
  const sortedWords = [...words].sort((a, b) => b.size - a.size);
  
  sortedWords.forEach(word => {
    ctx.font = `bold ${word.size}px Impact`;
    const metrics = ctx.measureText(word.text);
    const wordWidth = metrics.width;
    const wordHeight = word.size * 1.2; // Add line height factor
    
    let placed = false;
    let angle = 0;
    let radius = 10;
    const maxRadius = Math.min(width, height) / 2 - PADDING;
    const angleStep = 0.05; // Smaller step for finer spiral
    
    // Try to place word using spiral
    while (!placed && radius < maxRadius) {
      // Try multiple angles at this radius
      for (let i = 0; i < 72; i++) { // 72 attempts per radius
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Check bounds
        if (x - wordWidth / 2 < PADDING || 
            x + wordWidth / 2 > width - PADDING ||
            y - wordHeight / 2 < PADDING ||
            y + wordHeight / 2 > height - PADDING) {
          angle += angleStep;
          continue;
        }
        
        // Check collision with existing words
        if (!checkWordCollision(x, y, wordWidth, wordHeight, positions)) {
          placed = true;
          positions.push({
            ...word,
            x,
            y,
            width: wordWidth,
            height: wordHeight
          });
          break;
        }
        
        angle += angleStep;
      }
      
      // Increase radius for next iteration
      radius += 15;
    }
    
    // If still not placed, try random positions
    if (!placed) {
      let randomAttempts = 0;
      while (!placed && randomAttempts < 50) {
        const x = centerX + (Math.random() - 0.5) * width * 0.8;
        const y = centerY + (Math.random() - 0.5) * height * 0.8;
        
        if (x - wordWidth / 2 >= PADDING &&
            x + wordWidth / 2 <= width - PADDING &&
            y - wordHeight / 2 >= PADDING &&
            y + wordHeight / 2 <= height - PADDING &&
            !checkWordCollision(x, y, wordWidth, wordHeight, positions)) {
          
          positions.push({
            ...word,
            x,
            y,
            width: wordWidth,
            height: wordHeight
          });
          placed = true;
        }
        randomAttempts++;
      }
    }
  });
  
  return positions;
};

/**
 * Note: d3-cloud library has compatibility issues with Astro/React SSR.
 * Using computeWordPositions() with spiral algorithm instead for reliable word placement.
 */
