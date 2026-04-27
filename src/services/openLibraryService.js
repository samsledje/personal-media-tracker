// Open Library API service for book searches

const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org';
import { generateFuzzyAlternatives, shouldTryFuzzySearch } from '../utils/fuzzySearchUtils.js';
import { parseSearchQuery } from '../utils/searchQueryParser.js';

/**
 * Custom error class for Open Library API errors
 */
export class OpenLibraryError extends Error {
  constructor(message, type, statusCode = null) {
    super(message);
    this.name = 'OpenLibraryError';
    this.type = type; // 'NETWORK', 'SERVICE_DOWN', 'TIMEOUT'
    this.statusCode = statusCode;
  }
}

/**
 * Search for books using Open Library API with enhanced query parsing
 * Supports search by title, author, year, and series
 * Note: This function requests edition data to get ISBN information from the most relevant edition.
 * It prefers ISBN-13 over ISBN-10 when both are available.
 * Includes fuzzy search fallback for misspelled queries.
 * @param {string} query - Search query (e.g., "Harry Potter", "author J.K. Rowling", "1984 by Orwell")
 * @param {number} limit - Maximum number of results (default: 12)
 * @returns {Promise<object[]>} Array of book objects
 */
export const searchBooks = async (query, limit = 12) => {
  if (!query.trim()) {
    throw new Error('Query cannot be empty');
  }

  const trimmedQuery = query.trim();

  try {
    // Parse the query to understand search intent
    const parsedQuery = parseSearchQuery(trimmedQuery);
    console.debug('[OpenLibrary] Parsed query:', parsedQuery);

    // Build optimized search query for Open Library API
    // Open Library supports field-specific searches: title:, author:, etc.
    let searchQuery = trimmedQuery;
    
    if (parsedQuery.searchType === 'author' && parsedQuery.author) {
      searchQuery = `author:${parsedQuery.author}`;
      console.debug(`[OpenLibrary] Searching by author: "${parsedQuery.author}"`);
    } else if (parsedQuery.director) {
      // "Title by Author" — the parser maps "by" to director; treat as author for books
      searchQuery = `author:${parsedQuery.director}`;
      console.debug(`[OpenLibrary] Searching by author (via 'by' keyword): "${parsedQuery.director}"`);
    } else if (parsedQuery.titleKeywords.length > 0) {
      // Use title keywords for more focused search
      searchQuery = parsedQuery.titleKeywords[0];
      if (parsedQuery.year) {
        // Add year as additional search term (OpenLibrary doesn't have year: field)
        searchQuery += ` ${parsedQuery.year}`;
      }
    }

    // Try the optimized search first
    const books = await performBookSearch(searchQuery, limit);

    // If we got results, return them
    if (!shouldTryFuzzySearch(books, 1)) {
      return books;
    }

    // If no results and we used field-specific search, try a general search
    if (searchQuery !== trimmedQuery && parsedQuery.titleKeywords.length > 0) {
      console.debug('[OpenLibrary] Field-specific search returned no results, trying general search');
      const generalBooks = await performBookSearch(parsedQuery.titleKeywords[0], limit);
      if (!shouldTryFuzzySearch(generalBooks, 1)) {
        return generalBooks;
      }
    }

    // Try fuzzy alternatives
    console.debug('[OpenLibrary] No results for exact search, trying fuzzy alternatives');
    const alternatives = generateFuzzyAlternatives(trimmedQuery, 3);

    for (const alternative of alternatives) {
      console.debug(`[OpenLibrary] Trying fuzzy alternative: "${alternative}"`);
      try {
        const fuzzyBooks = await performBookSearch(alternative, limit);
        if (fuzzyBooks.length > 0) {
          console.debug(`[OpenLibrary] Found ${fuzzyBooks.length} results with fuzzy search: "${alternative}"`);
          // Mark these results as coming from fuzzy search
          return fuzzyBooks.map(book => ({ ...book, _fuzzySearch: true, _originalQuery: trimmedQuery }));
        }
      } catch (error) {
        // Continue to next alternative if this one fails
        console.debug(`[OpenLibrary] Fuzzy alternative "${alternative}" failed:`, error.message);
      }
    }

    // Return empty array if no alternatives worked
    return books;
  } catch (error) {
    console.error('Error searching books:', error);
    // If already an OpenLibraryError, re-throw it
    if (error instanceof OpenLibraryError) {
      throw error;
    }
    // Network errors (no internet, DNS failure, etc.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new OpenLibraryError(
        'Unable to connect to Open Library. Please check your internet connection.',
        'NETWORK'
      );
    }
    throw new OpenLibraryError(
      'Error searching for books. Please try again.',
      'NETWORK'
    );
  }
};

/**
 * Internal function to perform the actual book search
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<object[]>} Array of book objects
 */
const performBookSearch = async (query, limit) => {
  // Request edition ISBN data along with work data
  const response = await fetch(
    `${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,first_publish_year,cover_i,editions,editions.isbn&limit=${limit}`
  );

  if (!response.ok) {
    if (response.status >= 500) {
      throw new OpenLibraryError(
        'Open Library service is temporarily unavailable. Please try again later.',
        'SERVICE_DOWN',
        response.status
      );
    }
    throw new OpenLibraryError(
      `Open Library error: ${response.status}`,
      'NETWORK',
      response.status
    );
  }

  const data = await response.json();

  const books = data.docs.slice(0, limit).map(book => {
    // Get the best ISBN from the most relevant edition
    let isbn = null;
    if (book.editions && book.editions.docs && book.editions.docs.length > 0) {
      const firstEdition = book.editions.docs[0];
      if (firstEdition.isbn && firstEdition.isbn.length > 0) {
        // Prefer ISBN-13 (13 characters) over ISBN-10 (10 characters)
        const isbn13 = firstEdition.isbn.find(isbn => isbn.length === 13);
        const isbn10 = firstEdition.isbn.find(isbn => isbn.length === 10);
        isbn = isbn13 || isbn10 || firstEdition.isbn[0];
      }
    }

    return {
      title: book.title || 'Unknown Title',
      author: book.author_name?.[0] || 'Unknown Author',
      year: book.first_publish_year,
      isbn: isbn,
      coverUrl: book.cover_i
        ? `${COVERS_BASE_URL}/b/id/${book.cover_i}-M.jpg`
        : null,
      type: 'book'
    };
  });

  return books;
};/**
 * Fetch book data by ISBN using Open Library API
 * Returns null if not found or on error
 * @param {string} isbn
 * @returns {Promise<object|null>} { title, author, year, isbn, coverUrl }
 */
export const getBookByISBN = async (isbn) => {
  if (!isbn) return null;

  // Normalize ISBN: remove non-alphanumeric and uppercase any trailing x
  const normalized = String(isbn).replace(/[^0-9Xx]/g, '').toUpperCase();

  try {
    // Try the ISBN endpoint first
    const isbnUrl = `${OPEN_LIBRARY_BASE_URL}/isbn/${encodeURIComponent(normalized)}.json`;
    console.debug('[OpenLibrary] fetching ISBN URL:', isbnUrl);
    let resp;
    try {
      resp = await fetch(isbnUrl);
    } catch {
      // Network error on first fetch - throw immediately to avoid multiple prompts
      throw new OpenLibraryError(
        'Unable to connect to Open Library. Please check your internet connection.',
        'NETWORK'
      );
    }

    let data = null;
    if (resp.ok) {
      data = await resp.json();
      console.debug('[OpenLibrary] ISBN endpoint hit', normalized, 'response:', data);
    } else if (resp.status >= 500) {
      // Service down - throw immediately
      throw new OpenLibraryError(
        'Open Library service is temporarily unavailable. Please try again later.',
        'SERVICE_DOWN',
        resp.status
      );
    } else if (resp.status === 404) {
      // Fallback: use the search endpoint which can sometimes find editions by ISBN
      try {
        const searchUrl = `${OPEN_LIBRARY_BASE_URL}/search.json?isbn=${encodeURIComponent(normalized)}&limit=1`;
        console.debug('[OpenLibrary] fetching search fallback URL:', searchUrl);
        let sresp;
        try {
          sresp = await fetch(searchUrl);
        } catch {
          // Network error - already handled above, just return null for 404 fallback
          return null;
        }
        if (sresp.ok) {
          const sdata = await sresp.json();
          console.debug('[OpenLibrary] search.json fallback for ISBN', normalized, 'response.docs:', sdata.docs && sdata.docs.slice(0, 1));
          // sdata.docs may contain edition keys (edition_key) or work keys; prefer edition_key
          const doc = sdata.docs && sdata.docs[0];
          if (doc) {
            const editionKey = doc.edition_key?.[0];
            if (editionKey) {
              const editionUrl = `${OPEN_LIBRARY_BASE_URL}/books/${encodeURIComponent(editionKey)}.json`;
              console.debug('[OpenLibrary] fetching edition URL:', editionUrl);
              const edResp = await fetch(editionUrl);
              if (edResp.ok) data = await edResp.json();
            } else if (doc.key) {
              // as a last resort, fetch the work
              const workUrl = `${OPEN_LIBRARY_BASE_URL}${doc.key}.json`;
              console.debug('[OpenLibrary] fetching work URL:', workUrl);
              const workResp = await fetch(workUrl);
              if (workResp.ok) data = await workResp.json();
            }
          }
        }
      } catch {
        // ignore fallback errors
      }
    } else {
      // other HTTP error
      return null;
    }

    if (!data) return null;

    // Attempt to extract author name(s)
    let author = null;
    if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
      try {
        // authors are objects with key, need to fetch author detail
        const authorKey = data.authors[0].key; // e.g. "/authors/OL12345A"
        const authorResp = await fetch(`${OPEN_LIBRARY_BASE_URL}${authorKey}.json`);
        if (authorResp.ok) {
          const authorData = await authorResp.json();
          author = authorData.name || null;
        }
      } catch {
        // fallback: leave author null
      }
    }

    // Cover: Open Library provides covers via cover_edition_key or covers array
    let coverUrl = null;
    if (data.covers && Array.isArray(data.covers) && data.covers.length > 0) {
      coverUrl = `${COVERS_BASE_URL}/b/id/${data.covers[0]}-L.jpg`;
    } else if (data.cover_edition_key) {
      // fetch edition to get cover id
      try {
        const edResp = await fetch(`${OPEN_LIBRARY_BASE_URL}/books/${data.cover_edition_key}.json`);
        if (edResp.ok) {
          const ed = await edResp.json();
          if (ed.covers && ed.covers.length > 0) {
            coverUrl = `${COVERS_BASE_URL}/b/id/${ed.covers[0]}-L.jpg`;
          }
        }
      } catch {
        // ignore
      }
    }

    // Additional fallback: use search endpoint to get a cover_i if we still don't have a cover
    if (!coverUrl) {
      try {
        const sresp = await fetch(`${OPEN_LIBRARY_BASE_URL}/search.json?isbn=${encodeURIComponent(normalized)}&limit=1`);
        if (sresp.ok) {
          const sdata = await sresp.json();
          const doc = sdata.docs && sdata.docs[0];
          if (doc && doc.cover_i) {
            coverUrl = `${COVERS_BASE_URL}/b/id/${doc.cover_i}-L.jpg`;
            console.debug('[OpenLibrary] obtained cover via search.json cover_i for ISBN', normalized, 'cover_i:', doc.cover_i);
          }
        }
      } catch {
        // ignore
      }
    }

    const result = {
      title: data.title || null,
      author: author,
      year: data.publish_date || data.publish_year?.[0] || null,
      isbn: String(normalized),
      coverUrl: coverUrl,
      type: 'book'
    };
    console.debug('[OpenLibrary] returning normalized book data for ISBN', normalized, result);
    return result;
  } catch {
    console.error('Error fetching book by ISBN', isbn);

    // For network errors during imports, we want to alert the user
    throw new OpenLibraryError(
      'Unable to connect to Open Library. Please check your internet connection.',
      'NETWORK'
    );
  }
};
