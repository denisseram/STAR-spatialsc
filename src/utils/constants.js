/**
 * Application-wide constants and configurations
 */

export const FILTER_MODES = {
  AND: "AND",
  OR: "OR"
};

export const CODE_LEVELS = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  QUADRUPLE: 4
};

export const STOP_WORDS = new Set([
  'what', 'why', 'how', 'when', 'where', 'who', 'which', 'is', 'are', 'was', 'were',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
  'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here', 'then', 'than',
  'so', 'if', 'about', 'into', 'through', 'over', 'under', 'again', 'further', 'other', 'spatial', 'with'
]);

export const WORD_CLOUD_CONFIG = {
  MAX_WORDS: 30,
  FONT_SIZE_MIN: 16,
  FONT_SIZE_MAX: 48,
  CANVAS_WIDTH: 280,
  CANVAS_HEIGHT: 250,
  PADDING: 5,
  COLLISION_ATTEMPTS: 100
};

export const PAPER_LINK_TEXT = "Link";
export const VIEW_PAPER_TEXT = "View Paper";

export const SORT_OPTIONS = {
  RELEVANCE: "relevance",
  NEWEST: "newest",
  OLDEST: "oldest",
  TITLE: "title"
};

export const SORT_OPTION_LABELS = {
  [SORT_OPTIONS.RELEVANCE]: "Relevance",
  [SORT_OPTIONS.NEWEST]: "Newest publication",
  [SORT_OPTIONS.OLDEST]: "Oldest publication",
  [SORT_OPTIONS.TITLE]: "Paper title"
};

export const SEARCH_MODES = {
  KEYWORDS: "keywords",
  SIMILAR: "similar"
};

export const SEARCH_MODE_LABELS = {
  [SEARCH_MODES.KEYWORDS]: "Keywords",
  [SEARCH_MODES.SIMILAR]: "Similar meaning"
};

// Debounce delay for the research-question search, in ms.
export const SEARCH_DEBOUNCE_MS = 220;

// Display order for the top-level classification categories, used both by
// the sidebar accordion and the figure card's code list. Categories not
// listed here (e.g. "Other") sort after these, in their natural order.
export const CATEGORY_ORDER = ["Data", "Task", "Visualization"];
