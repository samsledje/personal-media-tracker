// Utility functions for fetching cover images from external APIs
import { getMovieByTitleYear } from '../services/omdbService.js';
import { getBookByISBN, searchBooks } from '../services/openLibraryService.js';
import { searchMovies as searchTmdbMovies, isServiceAvailable as isTmdbAvailable } from '../services/tmdbService.js';

/**
 * Attempt to fetch a cover URL for an item using available data
 * For books: tries ISBN first, then falls back to title+author search
 * For movies: uses title+year to fetch from OMDb
 * 
 * @param {object} item - The item to fetch cover for
 * @param {string} item.type - 'book' or 'movie'
 * @param {string} item.title - Title of the item
 * @param {string} [item.isbn] - ISBN for books
 * @param {string} [item.author] - Author for books
 * @param {string} [item.director] - Director for movies
 * @param {string} [item.year] - Year of publication/release
 * @returns {Promise<string|null>} Cover URL or null if not found
 */
export const fetchCoverForItem = async (item) => {
  if (!item || !item.type || !item.title) {
    throw new Error('Invalid item: type and title are required');
  }

  if (item.type === 'book') {
    return await fetchBookCover(item);
  } else if (item.type === 'movie') {
    return await fetchMovieCover(item);
  } else {
    throw new Error(`Unsupported item type: ${item.type}`);
  }
};

/**
 * Fetch cover for a book item
 * Tries ISBN first, then title+author search
 * 
 * @param {object} book - Book item
 * @returns {Promise<string|null>} Cover URL or null if not found
 */
const fetchBookCover = async (book) => {
  // Try ISBN first if available
  if (book.isbn && book.isbn.trim()) {
    try {
      const bookData = await getBookByISBN(book.isbn);
      if (bookData && bookData.coverUrl) {
        return bookData.coverUrl;
      }
    } catch (error) {
      console.warn('Error fetching book by ISBN:', error);
      // Continue to title+author search fallback
    }
  }

  // Fallback: search by title+author
  if (book.title && book.title.trim()) {
    try {
      const searchQuery = book.author 
        ? `${book.title} ${book.author}`
        : book.title;
      
      const results = await searchBooks(searchQuery, 1);
      
      if (results && results.length > 0 && results[0].coverUrl) {
        return results[0].coverUrl;
      }
    } catch (error) {
      console.warn('Error searching for book cover:', error);
    }
  }

  return null;
};

/**
 * Fetch cover for a movie item
 * Tries TMDB first (if available), then falls back to OMDb
 *
 * @param {object} movie - Movie item
 * @returns {Promise<string|null>} Cover URL or null if not found
 */
const fetchMovieCover = async (movie) => {
  if (!movie.title || !movie.title.trim()) {
    return null;
  }

  if (isTmdbAvailable()) {
    try {
      const query = movie.year ? `${movie.title} ${movie.year}` : movie.title;
      const results = await searchTmdbMovies(query, 1);
      if (results && results.length > 0 && results[0].coverUrl) {
        return results[0].coverUrl;
      }
    } catch (error) {
      console.warn('Error fetching movie cover from TMDB:', error);
    }
  }

  try {
    const movieData = await getMovieByTitleYear(movie.title, movie.year || null);
    if (movieData && movieData.coverUrl) {
      return movieData.coverUrl;
    }
  } catch (error) {
    console.warn('Error fetching movie cover from OMDb:', error);
  }

  return null;
};

/**
 * Fetch covers for all items that are missing one.
 * Processes sequentially to avoid rate-limiting free-tier APIs.
 *
 * @param {object[]} items - All items
 * @param {function} saveItem - Async function to persist an updated item
 * @param {function} [onProgress] - Optional callback({ done, total, current })
 * @returns {Promise<{succeeded: number, failed: number}>}
 */
export const fetchAllMissingCovers = async (items, saveItem, onProgress) => {
  const missing = items.filter(item => !item.coverUrl);
  const total = missing.length;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const item = missing[i];
    onProgress?.({ done: i, total, current: item });
    try {
      const coverUrl = await fetchCoverForItem(item);
      if (coverUrl) {
        await saveItem({ ...item, coverUrl });
        succeeded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  onProgress?.({ done: total, total, current: null });
  return { succeeded, failed };
};
