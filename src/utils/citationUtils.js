/**
 * Citation and paper metadata formatting utilities
 */

/**
 * Extract author from source name in format "Author - Year - Title.pdf"
 * @param {string} sourceName - Source file name
 * @returns {string|null} Extracted author name or null
 */
export const extractAuthor = (sourceName) => {
  if (!sourceName) return null;
  const match = sourceName.match(/^(.+?)\s*-\s*\d{4}/);
  return match ? match[1].trim() : null;
};

/**
 * Format citation for display
 * Prioritizes formal citation if available, falls back to author extraction
 * @param {{citation: string|null, sourceName: string, year: string|null}} metadata - Citation metadata
 * @returns {string|null} Formatted citation string
 */
export const formatDisplayCitation = (metadata) => {
  const { citation, sourceName, year } = metadata;
  
  // Check if citation is valid (not just a year)
  if (citation && citation.length > 4 && !citation.match(/^\d{4}$/)) {
    return citation;
  }
  
  // Try extracting author from source name
  const author = extractAuthor(sourceName);
  if (author) {
    return year ? `${author} - ${year}` : author;
  }
  
  return null;
};

/**
 * Format et al. in HTML for rich display
 * @param {string} text - Text containing "et al."
 * @returns {string} HTML string with et al. wrapped in em tags
 */
export const formatEtAl = (text) => {
  return text.replace(/et al\./g, '<em>et al.</em>');
};

/**
 * Build paper link URL
 * @param {string} url - Paper URL
 * @param {string} paperTitle - Paper title for fallback
 * @returns {string|null} Final URL or null if no link available
 */
export const getPaperLink = (url, paperTitle) => {
  return url || null;
};
