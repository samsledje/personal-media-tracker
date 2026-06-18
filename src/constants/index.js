// Application constants and configuration

export const CARD_SIZES = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  XLARGE: 'xlarge'
};

export const FILTER_TYPES = {
  ALL: 'all',
  BOOK: 'book',
  MOVIE: 'movie'
};

export const STATUS_TYPES = {
  BOOK: {
    TO_READ: 'to-read',
    READING: 'reading',
    READ: 'read',
    DNF: 'dnf'
  },
  MOVIE: {
    TO_WATCH: 'to-watch',
    WATCHING: 'watching',
    WATCHED: 'watched',
    DNF: 'dnf'
  }
};

/**
 * Canonical default status for an item type. Used when an item has no status
 * (e.g. legacy markdown, CSV/import rows). Single source of truth — import this
 * instead of re-deriving the default inline.
 * @param {string} type - Item type ('book' or 'movie')
 * @returns {string} Default status value
 */
export const getDefaultStatus = (type) =>
  type === 'book' ? STATUS_TYPES.BOOK.READ : STATUS_TYPES.MOVIE.WATCHED;

export const STATUS_LABELS = {
  'to-read': 'To Read',
  'reading': 'Reading',
  'read': 'Read',
  'to-watch': 'To Watch',
  'watching': 'Watching',
  'watched': 'Watched',
  'dnf': 'Did Not Finish'
};

export const STATUS_ICONS = {
  'to-read': 'layers',
  'reading': 'book-open',
  'read': 'check-circle',
  'to-watch': 'layers',
  'watching': 'play-circle',
  'watched': 'check-circle',
  'dnf': 'x-circle'
};

export const STATUS_COLORS = {
  'to-read': 'blue',
  'reading': 'yellow',
  'read': 'green',
  'to-watch': 'blue',
  'watching': 'yellow',
  'watched': 'green',
  'dnf': 'red'
};

export const SORT_OPTIONS = {
  DATE_ADDED: 'dateAdded',
  DATE_CONSUMED: 'dateConsumed',
  TITLE: 'title',
  AUTHOR: 'author',
  YEAR: 'year',
  STATUS: 'status',
  RATING: 'rating'
};

export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc'
};

export const RECENT_FILTER_OPTIONS = {
  ANY: 'any',
  LAST_7: 'last7',
  LAST_30: 'last30',
  LAST_90: 'last90',
  LAST_6_MONTHS: 'last6months',
  LAST_YEAR: 'lastyear',
  YEAR_TO_DATE: 'yeartodate',
  CUSTOM_DATE_RANGE: 'customdaterange'
};

export const DEFAULT_THEME = {
  PRIMARY: '#0b1220', // dark navy
  HIGHLIGHT: '#7c3aed' // purple-600
};

export const CSV_FORMATS = {
  GOODREADS: 'goodreads',
  LETTERBOXD: 'letterboxd',
  GENERIC: 'generic'
};

export const KEYBOARD_SHORTCUTS = {
  HELP: '?',
  SEARCH: '/',
  SEARCH_ALT: 'k',
  ADD: 'n',
  ONLINE_SEARCH: 's',
  FILTERS: 'f',
  CUSTOMIZE: 'c',
  SWITCH_STORAGE: 't',
  FILTER_ALL: 'a',
  FILTER_BOOKS: 'b',
  FILTER_MOVIES: 'm',
  SELECTION_MODE: 'v',
  SELECT_ALL: 'a',
  ESCAPE: 'Escape',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  ENTER: 'Enter',
  SPACE: ' ',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  // Modal-specific shortcuts
  STATUS_TO_READ_WATCH: 'u',
  STATUS_IN_PROGRESS: 'i',
  STATUS_COMPLETED: 'o',
  STATUS_DNF: 'x',
  RATING_1: '1',
  RATING_2: '2',
  RATING_3: '3',
  RATING_4: '4',
  RATING_5: '5',
  RATING_CLEAR: '0',
  EDIT_MODE: 'e',
  DELETE_ITEM: 'd',
  CONFIRM_ACTION: 'Enter' // Ctrl/Cmd+Enter for confirmations
};

export const GRID_COLUMNS_BY_SIZE = {
  [CARD_SIZES.TINY]: 8,
  [CARD_SIZES.SMALL]: 5,
  [CARD_SIZES.MEDIUM]: 3,
  [CARD_SIZES.LARGE]: 3,
  [CARD_SIZES.XLARGE]: 2
};

export const LOCAL_STORAGE_KEYS = {
  CARD_SIZE: 'cardSize',
  THEME_PRIMARY: 'themePrimary',
  THEME_HIGHLIGHT: 'themeHighlight',
  OMDB_API_KEY: 'omdbApiKey',
  HALF_STARS_ENABLED: 'halfStarsEnabled'
};

export const CSS_VARIABLES = {
  PRIMARY: '--mt-primary',
  HIGHLIGHT: '--mt-highlight'
};
