/**
 * Semantic search utilities for finding similar words/questions
 */

/**
 * Calculate Levenshtein distance between two strings (edit distance)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Levenshtein distance
 */
export const levenshteinDistance = (a, b) => {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  const matrix = [];
  
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower[i - 1] === aLower[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[bLower.length][aLower.length];
};

/**
 * Calculate similarity score between two strings (0-1)
 * Uses normalized Levenshtein distance
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score (0-1)
 */
export const calculateSimilarity = (a, b) => {
  if (a === b) return 1;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  return 1 - (distance / maxLength);
};

/**
 * Check if a word contains another as substring (case-insensitive)
 * @param {string} word - Word to search in
 * @param {string} query - Query substring
 * @returns {boolean} True if query is contained in word
 */
export const containsSubstring = (word, query) => {
  return word.toLowerCase().includes(query.toLowerCase());
};

/**
 * Search for similar questions/codes
 * @param {string} query - Search query
 * @param {string[]} questions - Array of questions/codes (single level codes)
 * @param {number} minSimilarity - Minimum similarity threshold (0-1)
 * @returns {Array} Array of {text, similarity, type} objects sorted by similarity
 */
export const searchSimilarQuestions = (query, questions, minSimilarity = 0.5) => {
  if (!query || query.length === 0) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  
  return questions
    .map(question => {
      // Check for exact substring match (highest priority)
      if (containsSubstring(question, query)) {
        return {
          text: question,
          similarity: 1,
          type: 'exact'
        };
      }
      
      // Check for word-level similarity
      const words = question.toLowerCase()
        .replace(/[?.,;:!()[\]{}]/g, ' ')
        .split(/\s+/);
      
      const wordMatches = words
        .map(word => calculateSimilarity(word, queryLower))
        .filter(sim => sim >= minSimilarity);
      
      if (wordMatches.length > 0) {
        return {
          text: question,
          similarity: Math.max(...wordMatches),
          type: 'word'
        };
      }
      
      // Check overall string similarity
      const overallSimilarity = calculateSimilarity(question, query);
      if (overallSimilarity >= minSimilarity) {
        return {
          text: question,
          similarity: overallSimilarity,
          type: 'overall'
        };
      }
      
      return null;
    })
    .filter(result => result !== null)
    .sort((a, b) => {
      // Sort by type priority first (exact > word > overall)
      const typePriority = { 'exact': 0, 'word': 1, 'overall': 2 };
      if (typePriority[a.type] !== typePriority[b.type]) {
        return typePriority[a.type] - typePriority[b.type];
      }
      // Then by similarity score
      return b.similarity - a.similarity;
    });
};

/**
 * Get all unique single-level codes from figures
 * @param {object[]} figures - Array of figure objects
 * @returns {string[]} Array of unique single-level codes
 */
export const getAllQuestions = (figures) => {
  const questions = new Set();
  
  figures.forEach(figure => {
    (figure.codes || []).forEach(code => {
      if (!code.includes('.')) {
        questions.add(code);
      }
    });
  });
  
  return Array.from(questions).sort();
};
