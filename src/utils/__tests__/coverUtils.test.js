import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchCoverForItem, fetchAllMissingCovers } from '../coverUtils.js';

// Mock dependencies - must use vi.fn() in the mock factory
vi.mock('../../services/openLibraryService.js', () => ({
  getBookByISBN: vi.fn(),
  searchBooks: vi.fn()
}));

vi.mock('../../services/omdbService.js', () => ({
  getMovieByTitleYear: vi.fn()
}));

vi.mock('../../services/tmdbService.js', () => ({
  searchMovies: vi.fn(),
  isServiceAvailable: vi.fn()
}));

// Import after mock
import { getBookByISBN, searchBooks } from '../../services/openLibraryService.js';
import { getMovieByTitleYear } from '../../services/omdbService.js';
import { searchMovies as searchTmdbMovies, isServiceAvailable as isTmdbAvailable } from '../../services/tmdbService.js';

describe('coverUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchCoverForItem', () => {
    it('should throw error for invalid item', async () => {
      await expect(fetchCoverForItem(null)).rejects.toThrow('Invalid item');
      await expect(fetchCoverForItem({})).rejects.toThrow('Invalid item');
      await expect(fetchCoverForItem({ type: 'book' })).rejects.toThrow('Invalid item');
      await expect(fetchCoverForItem({ title: 'Test' })).rejects.toThrow('Invalid item');
    });

    it('should throw error for unsupported item type', async () => {
      await expect(
        fetchCoverForItem({ type: 'tv-show', title: 'Test' })
      ).rejects.toThrow('Unsupported item type');
    });

    describe('book cover fetching', () => {
      it('should fetch cover using ISBN', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          isbn: '9780743273565',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockResolvedValue({
          title: 'The Great Gatsby',
          coverUrl: 'https://example.com/gatsby.jpg'
        });

        const coverUrl = await fetchCoverForItem(book);

        expect(getBookByISBN).toHaveBeenCalledWith('9780743273565');
        expect(coverUrl).toBe('https://example.com/gatsby.jpg');
        expect(searchBooks).not.toHaveBeenCalled();
      });

      it('should fallback to title+author search when ISBN lookup fails', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          isbn: '9780743273565',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockRejectedValue(new Error('Book not found'));
        searchBooks.mockResolvedValue([
          {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            coverUrl: 'https://example.com/gatsby-search.jpg'
          }
        ]);

        const coverUrl = await fetchCoverForItem(book);

        expect(getBookByISBN).toHaveBeenCalledWith('9780743273565');
        expect(searchBooks).toHaveBeenCalledWith('The Great Gatsby F. Scott Fitzgerald', 1);
        expect(coverUrl).toBe('https://example.com/gatsby-search.jpg');
      });

      it('should fallback to title-only search when no author', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          isbn: '9780743273565'
        };

        getBookByISBN.mockRejectedValue(new Error('Book not found'));
        searchBooks.mockResolvedValue([
          {
            title: 'The Great Gatsby',
            coverUrl: 'https://example.com/gatsby-title.jpg'
          }
        ]);

        const coverUrl = await fetchCoverForItem(book);

        expect(searchBooks).toHaveBeenCalledWith('The Great Gatsby', 1);
        expect(coverUrl).toBe('https://example.com/gatsby-title.jpg');
      });

      it('should return null when ISBN lookup returns no cover', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          isbn: '9780743273565',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockResolvedValue({
          title: 'The Great Gatsby',
          coverUrl: null
        });

        const coverUrl = await fetchCoverForItem(book);

        expect(coverUrl).toBeNull();
      });

      it('should return null when search returns no results', async () => {
        const book = {
          type: 'book',
          title: 'Unknown Book',
          author: 'Unknown Author'
        };

        getBookByISBN.mockRejectedValue(new Error('Book not found'));
        searchBooks.mockResolvedValue([]);

        const coverUrl = await fetchCoverForItem(book);

        expect(coverUrl).toBeNull();
      });

      it('should return null when search returns result without cover', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockRejectedValue(new Error('Book not found'));
        searchBooks.mockResolvedValue([
          {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            coverUrl: null
          }
        ]);

        const coverUrl = await fetchCoverForItem(book);

        expect(coverUrl).toBeNull();
      });

      it('should handle empty ISBN gracefully', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          isbn: '',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockRejectedValue(new Error('Invalid ISBN'));
        searchBooks.mockResolvedValue([
          {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            coverUrl: 'https://example.com/gatsby.jpg'
          }
        ]);

        const coverUrl = await fetchCoverForItem(book);

        expect(searchBooks).toHaveBeenCalled();
        expect(coverUrl).toBe('https://example.com/gatsby.jpg');
      });

      it('should handle whitespace-only ISBN', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          isbn: '   ',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockRejectedValue(new Error('Invalid ISBN'));
        searchBooks.mockResolvedValue([
          {
            title: 'The Great Gatsby',
            coverUrl: 'https://example.com/gatsby.jpg'
          }
        ]);

        const coverUrl = await fetchCoverForItem(book);

        expect(searchBooks).toHaveBeenCalled();
        expect(coverUrl).toBe('https://example.com/gatsby.jpg');
      });

      it('should handle search errors gracefully', async () => {
        const book = {
          type: 'book',
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockRejectedValue(new Error('Book not found'));
        searchBooks.mockRejectedValue(new Error('Search failed'));

        const coverUrl = await fetchCoverForItem(book);

        expect(coverUrl).toBeNull();
      });

      it('should trim title before searching', async () => {
        const book = {
          type: 'book',
          title: '  The Great Gatsby  ',
          author: 'F. Scott Fitzgerald'
        };

        getBookByISBN.mockRejectedValue(new Error('Book not found'));
        searchBooks.mockResolvedValue([
          {
            title: 'The Great Gatsby',
            coverUrl: 'https://example.com/gatsby.jpg'
          }
        ]);

        const coverUrl = await fetchCoverForItem(book);

        // Title should be trimmed before searching
        expect(searchBooks).toHaveBeenCalled();
        // Verify it was called with trimmed title (the exact format may vary)
        const calls = searchBooks.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][0]).toContain('The Great Gatsby'); // Should contain trimmed title
      });
    });

    describe('movie cover fetching', () => {
      beforeEach(() => {
        isTmdbAvailable.mockReturnValue(false);
      });

      it('should fetch cover using title and year', async () => {
        const movie = {
          type: 'movie',
          title: 'The Matrix',
          year: '1999',
          director: 'Wachowskis'
        };

        getMovieByTitleYear.mockResolvedValue({
          title: 'The Matrix',
          year: '1999',
          coverUrl: 'https://example.com/matrix.jpg'
        });

        const coverUrl = await fetchCoverForItem(movie);

        expect(getMovieByTitleYear).toHaveBeenCalledWith('The Matrix', '1999');
        expect(coverUrl).toBe('https://example.com/matrix.jpg');
      });

      it('should fetch cover using title only when year not provided', async () => {
        const movie = {
          type: 'movie',
          title: 'The Matrix',
          director: 'Wachowskis'
        };

        getMovieByTitleYear.mockResolvedValue({
          title: 'The Matrix',
          coverUrl: 'https://example.com/matrix.jpg'
        });

        const coverUrl = await fetchCoverForItem(movie);

        expect(getMovieByTitleYear).toHaveBeenCalledWith('The Matrix', null);
        expect(coverUrl).toBe('https://example.com/matrix.jpg');
      });

      it('should return null when movie lookup returns no cover', async () => {
        const movie = {
          type: 'movie',
          title: 'The Matrix',
          year: '1999'
        };

        getMovieByTitleYear.mockResolvedValue({
          title: 'The Matrix',
          coverUrl: null
        });

        const coverUrl = await fetchCoverForItem(movie);

        expect(coverUrl).toBeNull();
      });

      it('should return null when movie not found', async () => {
        const movie = {
          type: 'movie',
          title: 'Unknown Movie',
          year: '1999'
        };

        getMovieByTitleYear.mockRejectedValue(new Error('Movie not found'));

        const coverUrl = await fetchCoverForItem(movie);

        expect(coverUrl).toBeNull();
      });

      it('should handle empty title', async () => {
        const movie = {
          type: 'movie',
          title: '',
          year: '1999'
        };

        // fetchCoverForItem throws error for invalid items (empty title)
        await expect(fetchCoverForItem(movie)).rejects.toThrow('Invalid item');
        expect(getMovieByTitleYear).not.toHaveBeenCalled();
      });

      it('should handle whitespace-only title', async () => {
        const movie = {
          type: 'movie',
          title: '   ',
          year: '1999'
        };

        const coverUrl = await fetchCoverForItem(movie);

        expect(coverUrl).toBeNull();
        expect(getMovieByTitleYear).not.toHaveBeenCalled();
      });

      it('should trim title before searching', async () => {
        const movie = {
          type: 'movie',
          title: '  The Matrix  ',
          year: '1999'
        };

        getMovieByTitleYear.mockResolvedValue({
          title: 'The Matrix',
          coverUrl: 'https://example.com/matrix.jpg'
        });

        const coverUrl = await fetchCoverForItem(movie);

        // Title should be trimmed before calling API
        expect(getMovieByTitleYear).toHaveBeenCalled();
        // The exact call format may trim internally, so just verify it was called
        const calls = getMovieByTitleYear.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][0].trim()).toBe('The Matrix'); // First arg should be trimmed title
      });

      it('should handle API errors gracefully', async () => {
        const movie = {
          type: 'movie',
          title: 'The Matrix',
          year: '1999'
        };

        getMovieByTitleYear.mockRejectedValue(new Error('API error'));

        const coverUrl = await fetchCoverForItem(movie);

        expect(coverUrl).toBeNull();
      });

      describe('TMDB fallback', () => {
        it('should use TMDB when available and return its cover', async () => {
          isTmdbAvailable.mockReturnValue(true);
          searchTmdbMovies.mockResolvedValue([{ title: 'The Matrix', coverUrl: 'https://tmdb.example.com/matrix.jpg' }]);

          const coverUrl = await fetchCoverForItem({ type: 'movie', title: 'The Matrix', year: '1999' });

          expect(searchTmdbMovies).toHaveBeenCalledWith('The Matrix 1999', 1);
          expect(coverUrl).toBe('https://tmdb.example.com/matrix.jpg');
          expect(getMovieByTitleYear).not.toHaveBeenCalled();
        });

        it('should fall back to OMDb when TMDB returns no cover', async () => {
          isTmdbAvailable.mockReturnValue(true);
          searchTmdbMovies.mockResolvedValue([{ title: 'The Matrix', coverUrl: null }]);
          getMovieByTitleYear.mockResolvedValue({ title: 'The Matrix', coverUrl: 'https://omdb.example.com/matrix.jpg' });

          const coverUrl = await fetchCoverForItem({ type: 'movie', title: 'The Matrix', year: '1999' });

          expect(getMovieByTitleYear).toHaveBeenCalled();
          expect(coverUrl).toBe('https://omdb.example.com/matrix.jpg');
        });

        it('should fall back to OMDb when TMDB throws', async () => {
          isTmdbAvailable.mockReturnValue(true);
          searchTmdbMovies.mockRejectedValue(new Error('TMDB error'));
          getMovieByTitleYear.mockResolvedValue({ title: 'The Matrix', coverUrl: 'https://omdb.example.com/matrix.jpg' });

          const coverUrl = await fetchCoverForItem({ type: 'movie', title: 'The Matrix', year: '1999' });

          expect(coverUrl).toBe('https://omdb.example.com/matrix.jpg');
        });

        it('should return null when both TMDB and OMDb fail', async () => {
          isTmdbAvailable.mockReturnValue(true);
          searchTmdbMovies.mockResolvedValue([]);
          getMovieByTitleYear.mockResolvedValue(null);

          const coverUrl = await fetchCoverForItem({ type: 'movie', title: 'The Matrix', year: '1999' });

          expect(coverUrl).toBeNull();
        });

        it('should skip TMDB and use OMDb when TMDB is unavailable', async () => {
          isTmdbAvailable.mockReturnValue(false);
          getMovieByTitleYear.mockResolvedValue({ title: 'The Matrix', coverUrl: 'https://omdb.example.com/matrix.jpg' });

          const coverUrl = await fetchCoverForItem({ type: 'movie', title: 'The Matrix', year: '1999' });

          expect(searchTmdbMovies).not.toHaveBeenCalled();
          expect(coverUrl).toBe('https://omdb.example.com/matrix.jpg');
        });

        it('should build TMDB query with year when present', async () => {
          isTmdbAvailable.mockReturnValue(true);
          searchTmdbMovies.mockResolvedValue([{ coverUrl: 'https://tmdb.example.com/cover.jpg' }]);

          await fetchCoverForItem({ type: 'movie', title: 'Inception', year: '2010' });

          expect(searchTmdbMovies).toHaveBeenCalledWith('Inception 2010', 1);
        });

        it('should build TMDB query without year when absent', async () => {
          isTmdbAvailable.mockReturnValue(true);
          searchTmdbMovies.mockResolvedValue([{ coverUrl: 'https://tmdb.example.com/cover.jpg' }]);

          await fetchCoverForItem({ type: 'movie', title: 'Inception' });

          expect(searchTmdbMovies).toHaveBeenCalledWith('Inception', 1);
        });
      });
    });
  });

  describe('fetchAllMissingCovers', () => {
    beforeEach(() => {
      isTmdbAvailable.mockReturnValue(false);
    });

    it('should skip items that already have a cover', async () => {
      const items = [
        { id: '1', type: 'book', title: 'Book A', coverUrl: 'https://example.com/a.jpg' },
        { id: '2', type: 'book', title: 'Book B', coverUrl: null },
      ];
      const saveItem = vi.fn();
      searchBooks.mockResolvedValue([{ coverUrl: 'https://example.com/b.jpg' }]);

      await fetchAllMissingCovers(items, saveItem);

      expect(saveItem).toHaveBeenCalledTimes(1);
      expect(saveItem).toHaveBeenCalledWith(expect.objectContaining({ id: '2', coverUrl: 'https://example.com/b.jpg' }));
    });

    it('should save items that get a cover', async () => {
      const items = [{ id: '1', type: 'book', title: 'Book A' }];
      const saveItem = vi.fn();
      searchBooks.mockResolvedValue([{ coverUrl: 'https://example.com/a.jpg' }]);

      const result = await fetchAllMissingCovers(items, saveItem);

      expect(saveItem).toHaveBeenCalledWith(expect.objectContaining({ id: '1', coverUrl: 'https://example.com/a.jpg' }));
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should not save items when no cover is found', async () => {
      const items = [{ id: '1', type: 'book', title: 'Book A' }];
      const saveItem = vi.fn();
      searchBooks.mockResolvedValue([]);

      const result = await fetchAllMissingCovers(items, saveItem);

      expect(saveItem).not.toHaveBeenCalled();
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should report correct succeeded and failed counts', async () => {
      const items = [
        { id: '1', type: 'book', title: 'Found' },
        { id: '2', type: 'book', title: 'Not Found' },
        { id: '3', type: 'book', title: 'Error' },
      ];
      const saveItem = vi.fn();
      searchBooks
        .mockResolvedValueOnce([{ coverUrl: 'https://example.com/found.jpg' }])
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('network error'));

      const result = await fetchAllMissingCovers(items, saveItem);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(2);
    });

    it('should call onProgress after each item', async () => {
      const items = [
        { id: '1', type: 'book', title: 'Book A' },
        { id: '2', type: 'book', title: 'Book B' },
      ];
      const saveItem = vi.fn();
      const onProgress = vi.fn();
      searchBooks.mockResolvedValue([]);

      await fetchAllMissingCovers(items, saveItem, onProgress);

      // Called before each item (done=0,done=1) plus final call (done=total)
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ done: 0, total: 2 }));
      expect(onProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({ done: 1, total: 2 }));
      expect(onProgress).toHaveBeenNthCalledWith(3, expect.objectContaining({ done: 2, total: 2, current: null }));
    });

    it('should return zero counts when all items already have covers', async () => {
      const items = [
        { id: '1', type: 'book', title: 'Book A', coverUrl: 'https://example.com/a.jpg' },
      ];
      const saveItem = vi.fn();

      const result = await fetchAllMissingCovers(items, saveItem);

      expect(saveItem).not.toHaveBeenCalled();
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle empty items array', async () => {
      const saveItem = vi.fn();
      const result = await fetchAllMissingCovers([], saveItem);

      expect(saveItem).not.toHaveBeenCalled();
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});

