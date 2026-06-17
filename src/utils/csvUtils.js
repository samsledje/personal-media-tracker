import { CSV_FORMATS, STATUS_TYPES, getDefaultStatus } from '../constants/index.js';
import { toast } from '../services/toastService.js';

/**
 * Normalize various date string formats to YYYY-MM-DD.
 * Returns empty string for invalid/empty inputs.
 * Handles formats like: "9/20/25", "9/20/2025", "2025-09-20", "2025/09/20"
 */
const normalizeDate = (input) => {
  if (!input) return '';
  let s = String(input).trim();

  // Already ISO-ish (YYYY-MM-DD or YYYY/MM/DD)
  const isoMatch = s.match(/^(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // US-style M/D/YY or M/D/YYYY
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let month = parseInt(usMatch[1], 10);
    let day = parseInt(usMatch[2], 10);
    let year = parseInt(usMatch[3], 10);
    if (year < 100) {
      // Interpret 2-digit years: 00-69 -> 2000-2069, 70-99 -> 1970-1999 (JS Date heuristics)
      year += year >= 70 ? 1900 : 2000;
    }
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return '';
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  // Try Date.parse as fallback and format to YYYY-MM-DD
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '';
};

/**
 * Sanitize ISBN-like values coming from CSVs.
 * Some spreadsheets export ISBNs as formulas like ="978123..." or prefix with '=' or a leading apostrophe.
 */
const sanitizeISBN = (input) => {
  if (input === null || input === undefined) return '';
  let s = String(input).trim();

  // Remove leading equals used by spreadsheets: ="978..." or =978...
  if (s.startsWith('="') && s.endsWith('"')) {
    s = s.slice(2, -1);
  } else if (s.startsWith('=')) {
    s = s.slice(1);
  }

  // Remove surrounding quotes or leading apostrophe
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  if (s.startsWith("'")) s = s.slice(1);

  // Remove spaces and non-printable characters
  s = s.replace(/\s+/g, '');

  return s;
};

/**
 * Map Goodreads "Exclusive Shelf" to status
 * @param {string} shelf - Goodreads shelf name
 * @returns {string} Mapped status value
 */
const mapGoodreadsShelfToStatus = (shelf) => {
  if (!shelf) return STATUS_TYPES.BOOK.READ;
  const shelfLower = shelf.toLowerCase().trim();
  switch (shelfLower) {
    case 'to-read':
    case 'want-to-read':
      return STATUS_TYPES.BOOK.TO_READ;
    case 'currently-reading':
    case 'reading':
      return STATUS_TYPES.BOOK.READING;
    case 'read':
      return STATUS_TYPES.BOOK.READ;
    case 'dnf':
    case 'did-not-finish':
    case 'did-not-finish-dnf':
    case 'abandoned':
    case 'gave-up':
      return STATUS_TYPES.BOOK.DNF;
    default:
      return STATUS_TYPES.BOOK.READ; // Default to read for unknown shelves
  }
};

export { mapGoodreadsShelfToStatus };

/**
 * Map Letterboxd watched status to status
 * @param {string} watched - Letterboxd watched value
 * @returns {string} Mapped status value
 */
const mapLetterboxdWatchedToStatus = (watched) => {
  if (!watched) return STATUS_TYPES.MOVIE.TO_WATCH;
  const watchedLower = watched.toLowerCase().trim();
  switch (watchedLower) {
    case 'true':
    case '1':
    case 'yes':
      return STATUS_TYPES.MOVIE.WATCHED;
    default:
      return STATUS_TYPES.MOVIE.TO_WATCH;
  }
};

export { mapLetterboxdWatchedToStatus };

/**
 * Parse CSV text into headers and rows
 * @param {string} text - CSV text content
 * @returns {object} Object with headers array and rows array
 */
export const parseCSV = (text) => {
  // Basic RFC4180-compatible CSV parser (handles quoted fields)
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nxt = text[i + 1];

    if (ch === '"') {
      if (inQuotes && nxt === '"') { // escaped quote
        cur += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\n' || (ch === '\r' && nxt === '\n')) && !inQuotes) {
      // handle CRLF or LF
      if (ch === '\r' && nxt === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }
  
  // push last
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1).map(r => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = r[i] !== undefined ? r[i].trim() : '';
    }
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));

  return { headers, rows: dataRows };
};

/**
 * Detect CSV format based on headers
 * @param {string[]} headers - Array of header strings
 * @returns {string} Detected format type
 */
export const detectCSVFormat = (headers = []) => {
  const h = headers.map(x => String(x).toLowerCase()).join('|');
  if (h.includes('my rating') || h.includes('isbn') && h.includes('author')) return CSV_FORMATS.GOODREADS;
  // Detect Letterboxd exports. They often include 'Your Rating', 'Watched', 'Name'/'Year' and sometimes a 'Letterboxd URI' column
  if (h.includes('letterboxd uri') || h.includes('your rating') || h.includes('watched') || (h.includes('name') && h.includes('year'))) return CSV_FORMATS.LETTERBOXD;
  return CSV_FORMATS.GENERIC;
};

/**
 * Map Goodreads CSV row to item object
 * @param {object} r - Raw CSV row object
 * @returns {object} Mapped item object
 */
export const mapGoodreadsRow = (r) => {
  const tags = (r['My Tags'] || r['Tags'] || r['Bookshelves'] || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const rating = r['My Rating'] ? parseFloat(r['My Rating']) : (r['Rating'] ? parseFloat(r['Rating']) : 0);
  const status = mapGoodreadsShelfToStatus(r['Exclusive Shelf'] || r['Shelf'] || '');
  
  // Prefer the `ISBN` column when available; fallback to `ISBN13`.
  // Ensure ISBN is sanitized for common spreadsheet exports like ="978..."
  const rawIsbn = r['ISBN'] || r['ISBN13'] || '';
  const isbnStr = sanitizeISBN(rawIsbn);

  return {
    title: r['Title'] || r['title'] || r['Name'] || '',
    author: r['Author'] || r['author'] || '',
    isbn: isbnStr,
    year: r['Year Published'] || r['Original Publication Year'] || r['Year'] || '',
    rating: isNaN(rating) ? 0 : rating,
    status: status,
  dateRead: normalizeDate(r['Date Read'] || r['Date read'] || r['Date read (YYYY/MM/DD)'] || ''),
    tags,
    review: r['My Review'] || r['Review'] || '',
    type: 'book',
    dateAdded: new Date().toISOString()
  };
};

/**
 * Map Letterboxd CSV row to item object
 * @param {object} r - Raw CSV row object
 * @returns {object} Mapped item object
 */
export const mapLetterboxdRow = (r) => {
  const tags = (r['Tags'] || r['tags'] || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const rawRating = r['Your Rating'] || r['Rating'] || r['star_rating'] || '';
  const rating = rawRating ? Math.round(parseFloat(rawRating) / 2) : 0;
  const status = mapLetterboxdWatchedToStatus(r['Watched'] || r['watched'] || '');
  
  return {
    title: r['Name'] || r['Title'] || r['name'] || '',
    year: r['Year'] || r['year'] || '',
    rating: isNaN(rating) ? 0 : rating,
    status,
  dateWatched: normalizeDate(r['Date Watched'] || r['Watched Date'] || r['Date'] || ''),
    tags,
    review: r['Review'] || r['Notes'] || '',
    type: 'movie',
    dateAdded: new Date().toISOString()
  };
};

/**
 * Map generic CSV row to item object
 * @param {object} r - Raw CSV row object
 * @returns {object} Mapped item object
 */
export const mapGenericRow = (r) => {
  // best-effort mapping from common column names
  const title = r['title'] || r['Title'] || r['name'] || r['Name'] || '';
  const type = (r['type'] || '').toLowerCase().includes('movie') ? 'movie' : 'book';
  const tags = (r['tags'] || r['Tags'] || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const actors = (r['actors'] || r['Actors'] || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const rating = r['rating'] ? Math.round(parseFloat(r['rating'])) : 0;
  
  // Try to map status, with fallback to default
  let status = r['status'] || r['Status'] || '';
  if (!status) {
    status = getDefaultStatus(type);
  }
  
  return {
    title,
    type,
    status,
    author: r['author'] || r['Author'] || '',
    director: r['director'] || r['Director'] || '',
    actors,
  isbn: sanitizeISBN(r['isbn'] || r['ISBN'] || ''),
    year: r['year'] || r['Year'] || '',
    rating: isNaN(rating) ? 0 : rating,
  dateRead: normalizeDate(r['dateRead'] || r['Date Read'] || r['date_read'] || ''),
  dateWatched: normalizeDate(r['dateWatched'] || r['Date Watched'] || r['date_watched'] || ''),
    tags,
    review: r['review'] || r['Review'] || '',
    dateAdded: new Date().toISOString()
  };
};

/**
 * Export items to CSV format
 * @param {object[]} items - Array of items to export
 * @returns {void} Downloads CSV file
 */
export const exportCSV = (items = []) => {
  try {
    const headers = [
      'id', 'title', 'type', 'status', 'author', 'director', 'actors', 'isbn', 'year', 'rating',
      'dateRead', 'dateWatched', 'dateAdded', 'tags', 'coverUrl', 'review', 'filename'
    ];

    const escape = (s) => {
      if (s === null || s === undefined) return '""';
      const str = String(Array.isArray(s) ? s.join(';') : s);
      return '"' + str.replace(/"/g, '""') + '"';
    };

    const rows = items.map(it => headers.map(h => {
      switch (h) {
        case 'actors': return escape(it.actors || []);
        case 'tags': return escape(it.tags || []);
        case 'filename': return escape(it.filename || '');
        case 'dateRead': return escape(it.dateRead || '');
        case 'dateWatched': return escape(it.dateWatched || '');
        default: return escape(it[h] ?? '');
      }
    }).join(',')).join('\n');

    const csv = headers.join(',') + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markdown-media-tracker-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error exporting CSV', err);
    const errorMsg = err.message || 'Unknown error';
    toast(`Error exporting CSV: ${errorMsg}`, { type: 'error' });
  }
};