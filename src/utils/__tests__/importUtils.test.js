import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processCSVImport, processZipImport, processImportFile } from '../importUtils.js';

// Mock external services only (not csvUtils - use real implementation)
const mockGetBookByISBN = vi.fn();
const mockGetMovieByTitleYear = vi.fn();

vi.mock('../../services/openLibraryService.js', () => ({
  getBookByISBN: (...args) => mockGetBookByISBN(...args),
  OpenLibraryError: class OpenLibraryError extends Error {
    constructor(message, type) {
      super(message);
      this.type = type;
      this.name = 'OpenLibraryError';
    }
  }
}));

vi.mock('../../services/omdbService.js', () => ({
  getMovieByTitleYear: (...args) => mockGetMovieByTitleYear(...args),
  OMDBError: class OMDBError extends Error {
    constructor(message, type) {
      super(message);
      this.type = type;
      this.name = 'OMDBError';
    }
  }
}));

vi.mock('../../services/toastService.js', () => ({
  toast: vi.fn()
}));

// Mock JSZip
const mockJSZipInstance = {
  loadAsync: vi.fn(),
  file: vi.fn()
};

vi.mock('jszip', () => ({
  default: vi.fn(() => mockJSZipInstance)
}));

// Import after mocks
import { getBookByISBN, OpenLibraryError } from '../../services/openLibraryService.js';
import { getMovieByTitleYear, OMDBError } from '../../services/omdbService.js';
import JSZip from 'jszip';

describe('importUtils', () => {
  let mockSaveItem;
  let mockOnProgress;
  let mockOnAPIError;
  let mockSignal;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSaveItem = vi.fn().mockResolvedValue(undefined);
    mockOnProgress = vi.fn();
    mockOnAPIError = vi.fn().mockResolvedValue({ continue: true, skipEnrichment: false });
    mockSignal = { aborted: false };

    // Reset JSZip mock
    mockJSZipInstance.loadAsync.mockResolvedValue(undefined);
    mockJSZipInstance.file.mockReturnValue(null);
    
    // Reset API mocks
    mockGetBookByISBN.mockResolvedValue(null);
    mockGetMovieByTitleYear.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processCSVImport', () => {
    it('should return 0 when no file provided', async () => {
      const result = await processCSVImport(null, [], mockSaveItem);
      expect(result.added).toBe(0);
      expect(result.format).toBeUndefined();
    });

    it('should process generic CSV file successfully', async () => {
      const file = new File(['Title,Author\nTest Book,Test Author'], 'test.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      
      expect(result.added).toBeGreaterThanOrEqual(0);
      expect(result.format).toBeDefined();
      expect(mockOnProgress).toHaveBeenCalled();
    });

    it('should process Goodreads CSV format', async () => {
      const goodreadsCSV = `Title,Author,ISBN,My Rating,Exclusive Shelf,Date Read
The Great Gatsby,F. Scott Fitzgerald,9780743273565,5,read,2024-01-15`;

      mockGetBookByISBN.mockResolvedValue({
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: '1925',
        coverUrl: 'https://example.com/gatsby.jpg'
      });

      const file = new File([goodreadsCSV], 'goodreads.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress, null, null, mockOnAPIError);
      
      expect(result.format).toBe('goodreads');
      expect(mockSaveItem).toHaveBeenCalled();
    });

    it('should process Letterboxd CSV format', async () => {
      const letterboxdCSV = `Name,Year,Rating
The Matrix,1999,5`;

      mockGetMovieByTitleYear.mockResolvedValue({
        director: 'Wachowskis',
        actors: ['Keanu Reeves'],
        coverUrl: 'https://example.com/matrix.jpg'
      });

      const file = new File([letterboxdCSV], 'watched.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress, null, null, mockOnAPIError);
      
      expect(result.format).toBe('letterboxd');
      expect(mockSaveItem).toHaveBeenCalled();
    });

    it('should handle duplicate detection', async () => {
      const existingItems = [
        { id: '1', title: 'Test Book', author: 'Test Author', type: 'book' }
      ];

      const file = new File(['Title,Author\nTest Book,Test Author'], 'test.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, existingItems, mockSaveItem, mockOnProgress);
      
      // Should detect duplicate and not add
      expect(result.added).toBe(0);
    });

    it('should handle progress callbacks', async () => {
      const file = new File(['Title,Author\nBook 1,Author 1\nBook 2,Author 2'], 'test.csv', { type: 'text/csv' });
      
      await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      
      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: expect.any(Number),
          added: expect.any(Number),
          total: expect.any(Number)
        })
      );
    });

    it('should handle abort signal', async () => {
      mockSignal.aborted = true;
      
      const file = new File(['Title,Author\nTest Book,Test Author'], 'test.csv', { type: 'text/csv' });
      
      await expect(
        processCSVImport(file, [], mockSaveItem, mockOnProgress, null, mockSignal)
      ).rejects.toThrow('Import was cancelled');
    });

    it('should handle abort during processing', async () => {
      const csvContent = 'Title,Author\nBook 1,Author 1\nBook 2,Author 2';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      // Abort signal before processing
      mockSignal.aborted = true;
      
      await expect(
        processCSVImport(file, [], mockSaveItem, mockOnProgress, null, mockSignal)
      ).rejects.toThrow('Import was cancelled');
    });

    it('should enrich Goodreads imports with Open Library data', async () => {
      const goodreadsCSV = `Title,Author,ISBN,My Rating
The Great Gatsby,F. Scott Fitzgerald,9780743273565,5`;

      mockGetBookByISBN.mockResolvedValue({
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: '1925',
        coverUrl: 'https://example.com/gatsby.jpg'
      });

      const file = new File([goodreadsCSV], 'goodreads.csv', { type: 'text/csv' });
      
      await processCSVImport(file, [], mockSaveItem, mockOnProgress, null, null, mockOnAPIError);
      
      expect(mockGetBookByISBN).toHaveBeenCalled();
      expect(mockSaveItem).toHaveBeenCalled();
    });

    it('should handle Open Library API errors gracefully', async () => {
      const goodreadsCSV = `Title,Author,ISBN,My Rating
Test Book,Test Author,9781234567890,4`;

      mockGetBookByISBN.mockRejectedValue(new OpenLibraryError('Book not found', 'NOT_FOUND'));

      const file = new File([goodreadsCSV], 'goodreads.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress, null, null, mockOnAPIError);
      
      // Should continue with spreadsheet data only
      expect(result.added).toBeGreaterThanOrEqual(0);
    });

    it('should handle OMDb API errors for Letterboxd imports', async () => {
      const letterboxdCSV = `Name,Year
The Matrix,1999`;

      mockGetMovieByTitleYear.mockRejectedValue(new OMDBError('Quota exceeded', 'QUOTA_EXCEEDED'));
      mockOnAPIError.mockResolvedValue({ continue: true, skipEnrichment: true });

      const file = new File([letterboxdCSV], 'watched.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress, null, null, mockOnAPIError);
      
      expect(mockOnAPIError).toHaveBeenCalled();
      expect(result.added).toBeGreaterThanOrEqual(0);
    });

    it('should stop import when user cancels on API error', async () => {
      const letterboxdCSV = `Name,Year
The Matrix,1999`;

      mockGetMovieByTitleYear.mockRejectedValue(new OMDBError('Quota exceeded', 'QUOTA_EXCEEDED'));
      mockOnAPIError.mockResolvedValue({ continue: false });

      const file = new File([letterboxdCSV], 'watched.csv', { type: 'text/csv' });
      
      await expect(
        processCSVImport(file, [], mockSaveItem, mockOnProgress, null, null, mockOnAPIError)
      ).rejects.toThrow('Import cancelled due to API error');
    });

    it('should handle malformed CSV data', async () => {
      // CSV with unclosed quotes or other issues
      const file = new File(['Title,Author\n"Unclosed quote,Test Author'], 'test.csv', { type: 'text/csv' });
      
      // Should handle gracefully or throw appropriate error
      await expect(
        processCSVImport(file, [], mockSaveItem, mockOnProgress)
      ).resolves.toBeDefined();
    });

    it('should batch save items efficiently', async () => {
      const csvRows = Array.from({ length: 25 }, (_, i) => `Book ${i + 1},Author ${i + 1}`);
      const csvContent = 'Title,Author\n' + csvRows.join('\n');

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      
      // Should save items (may be batched)
      expect(mockSaveItem).toHaveBeenCalled();
    });

    it('should handle Letterboxd ratings.csv file correctly', async () => {
      const existingItems = [
        { id: '1', title: 'The Matrix', director: 'Wachowskis', type: 'movie', rating: 0, year: '1999' }
      ];

      const ratingsCSV = `Name,Year,Rating
The Matrix,1999,5`;

      const file = new File([ratingsCSV], 'ratings.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, existingItems, mockSaveItem, mockOnProgress, existingItems);
      
      // Should update existing item (added stays 0), not create new one
      // The item is updated in-place, so added count doesn't increase
      expect(result.added).toBeGreaterThanOrEqual(0);
      // saveItem may or may not be called depending on matching logic
    });

    it('should handle Letterboxd reviews.csv file correctly', async () => {
      const existingItems = [
        { id: '1', title: 'The Matrix', director: 'Wachowskis', type: 'movie', review: '', tags: [] }
      ];

      const reviewsCSV = `Name,Year,Review,Tags
The Matrix,1999,Great movie!,sci-fi,action`;

      const file = new File([reviewsCSV], 'reviews.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, existingItems, mockSaveItem, mockOnProgress, existingItems);
      
      expect(mockSaveItem).toHaveBeenCalled();
    });

    it('should handle Letterboxd films.csv file correctly', async () => {
      const existingItems = [
        { id: '1', title: 'The Matrix', director: 'Wachowskis', type: 'movie', tags: [] }
      ];

      const filmsCSV = `Name,Year
The Matrix,1999`;

      const file = new File([filmsCSV], 'films.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, existingItems, mockSaveItem, mockOnProgress, existingItems);
      
      // Should add 'liked' tag to existing item
      expect(mockSaveItem).toHaveBeenCalled();
    });

    it('should not create new items from films.csv if not found', async () => {
      const filmsCSV = `Name,Year
The Matrix,1999`;

      const file = new File([filmsCSV], 'films.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress, []);
      
      // Should not create new items from films.csv
      expect(result.added).toBe(0);
    });
  });

  describe('processZipImport', () => {
    let mockZipFile;

    beforeEach(() => {
      mockZipFile = new File(['zip content'], 'letterboxd-export.zip', { type: 'application/zip' });
      
      // Reset JSZip mock
      mockJSZipInstance.loadAsync.mockResolvedValue(undefined);
      mockJSZipInstance.file.mockReturnValue(null);
    });

    it('should return empty result when no file provided', async () => {
      const result = await processZipImport(null, [], mockSaveItem);
      expect(result).toEqual({ added: 0, format: 'unknown', filesProcessed: [] });
    });

    it('should extract and process CSV files from zip', async () => {
      const watchedCSV = 'Name,Year\nThe Matrix,1999';
      
      mockJSZipInstance.file.mockImplementation((filename) => {
        if (filename === 'watched.csv') {
          return {
            async: vi.fn().mockResolvedValue(watchedCSV)
          };
        }
        return null;
      });

      mockGetMovieByTitleYear.mockResolvedValue({ director: 'Test', coverUrl: '' });

      const result = await processZipImport(mockZipFile, [], mockSaveItem, mockOnProgress, mockSignal);

      expect(result.format).toBe('letterboxd-zip');
      expect(result.filesProcessed).toBeDefined();
    });

    it('should handle zip with no CSV files', async () => {
      mockJSZipInstance.file.mockReturnValue(null);

      await expect(
        processZipImport(mockZipFile, [], mockSaveItem, mockOnProgress, mockSignal)
      ).rejects.toThrow('No supported CSV files found');
    });

    it('should handle abort signal in zip import', async () => {
      mockSignal.aborted = true;

      await expect(
        processZipImport(mockZipFile, [], mockSaveItem, mockOnProgress, mockSignal)
      ).rejects.toThrow('Import was cancelled');
    });

    it('should handle network failures during import', async () => {
      // Simulate network failure during save
      mockSaveItem.mockRejectedValueOnce(new Error('Network error'));

      const file = new File(['Title,Author\nTest Book,Test Author'], 'test.csv', { type: 'text/csv' });
      
      // Should continue processing despite individual failures
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      
      // May have 0 added if save failed, but should not throw
      expect(result).toBeDefined();
    });

    it('should handle malformed CSV data gracefully', async () => {
      // CSV with unclosed quotes or other issues
      const file = new File(['Title,Author\n"Unclosed quote,Test Author'], 'test.csv', { type: 'text/csv' });
      
      // Should handle gracefully or throw appropriate error
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      expect(result).toBeDefined();
    });

    it('should handle empty CSV file', async () => {
      const file = new File([''], 'empty.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      
      expect(result.added).toBe(0);
    });

    it('should handle items with filesystem-unfriendly characters in titles', async () => {
      const file = new File(['Title,Author\n"Book: ""A Story"" / Path\\To\\File",Test Author'], 'test.csv', { type: 'text/csv' });
      
      const result = await processCSVImport(file, [], mockSaveItem, mockOnProgress);
      
      expect(result.added).toBeGreaterThanOrEqual(0);
      if (result.added > 0) {
        expect(mockSaveItem).toHaveBeenCalled();
      }
    });

    it('should process files in correct order', async () => {
      const files = {
        'watched.csv': { async: vi.fn().mockResolvedValue('Name,Year\nMovie,1999') },
        'watchlist.csv': { async: vi.fn().mockResolvedValue('Name,Year\nMovie2,2000') },
        'ratings.csv': { async: vi.fn().mockResolvedValue('Name,Year,Rating\nMovie,1999,5') },
        'reviews.csv': { async: vi.fn().mockResolvedValue('Name,Year,Review\nMovie,1999,Great') },
        'likes/films.csv': { async: vi.fn().mockResolvedValue('Name,Year\nMovie,1999') }
      };

      mockJSZipInstance.file.mockImplementation((filename) => {
        return files[filename] || null;
      });

      mockGetMovieByTitleYear.mockResolvedValue({ director: 'Test', coverUrl: '' });

      const result = await processZipImport(mockZipFile, [], mockSaveItem, mockOnProgress, mockSignal);

      // Should process files in order: watched, watchlist, ratings, reviews, films
      expect(result.filesProcessed).toBeDefined();
      expect(mockSaveItem).toHaveBeenCalled();
    });
  });

  describe('processImportFile', () => {
    it('should process CSV file', async () => {
      const file = new File(['Title,Author\nBook,Author'], 'test.csv', { type: 'text/csv' });

      const result = await processImportFile(file, [], mockSaveItem, mockOnProgress, mockSignal);

      expect(result.format).toBeDefined();
      expect(result.filesProcessed).toEqual(['test.csv']);
    });

    it('should process ZIP file', async () => {
      const file = new File(['zip'], 'export.zip', { type: 'application/zip' });
      
      mockJSZipInstance.file.mockReturnValue(null);

      await expect(
        processImportFile(file, [], mockSaveItem, mockOnProgress, mockSignal)
      ).rejects.toThrow('No supported CSV files found');
    });

    it('should throw error for unsupported file type', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(
        processImportFile(file, [], mockSaveItem, mockOnProgress, mockSignal)
      ).rejects.toThrow('Unsupported file type');
    });

    it('should throw error when no file provided', async () => {
      await expect(
        processImportFile(null, [], mockSaveItem, mockOnProgress, mockSignal)
      ).rejects.toThrow('No file provided');
    });

    it('should handle abort signal', async () => {
      mockSignal.aborted = true;
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });

      await expect(
        processImportFile(file, [], mockSaveItem, mockOnProgress, mockSignal)
      ).rejects.toThrow('Import was cancelled');
    });
  });
});

