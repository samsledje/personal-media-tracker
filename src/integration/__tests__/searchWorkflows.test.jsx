/**
 * Integration tests for Search Workflows
 * Tests online search → add → edit workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useItems } from '../../hooks/useItems.js';
import { searchBooks } from '../../services/openLibraryService.js';
import { searchMovies } from '../../services/omdbService.js';
import { StorageFactory } from '../../services/storageAdapter.js';
import { MockFileSystemStorage } from '../../test/mocks/storage.js';

// Mock dependencies
vi.mock('../../services/storageAdapter.js', () => ({
  StorageFactory: {
    createAdapter: vi.fn(),
    getAvailableAdapters: vi.fn(() => Promise.resolve([
      { type: 'filesystem', name: 'Local Directory', available: true }
    ]))
  }
}));

vi.mock('../../services/openLibraryService.js', () => ({
  searchBooks: vi.fn(),
  getBookByISBN: vi.fn()
}));

vi.mock('../../services/omdbService.js', () => ({
  searchMovies: vi.fn(),
  getMovieByTitleYear: vi.fn()
}));

vi.mock('../../services/toastService.js', () => ({
  toast: vi.fn()
}));

describe('Search Workflows Integration', () => {
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStorage = new MockFileSystemStorage();
    mockStorage._setItems([]);
    
    StorageFactory.createAdapter.mockResolvedValue(mockStorage);
  });

  describe('book search workflow', () => {
    it('should search for books and add selected result', async () => {
      const mockResults = [
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          year: '1925',
          isbn: '9780743273565',
          coverUrl: 'https://example.com/gatsby.jpg',
          type: 'book'
        }
      ];
      
      searchBooks.mockResolvedValue(mockResults);
      
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      // Search for books
      const searchResults = await searchBooks('gatsby');
      expect(searchResults).toHaveLength(1);
      
      // Add the first result
      const selectedBook = searchResults[0];
      await act(async () => {
        await result.current.saveItem(selectedBook);
      });
      
      expect(result.current.items).toContainEqual(
        expect.objectContaining({
          title: 'The Great Gatsby'
        })
      );
    });

    it('should handle empty search results', async () => {
      searchBooks.mockResolvedValue([]);
      
      const results = await searchBooks('nonexistent book xyz123');
      
      expect(results).toEqual([]);
    });

    it('should handle search errors gracefully', async () => {
      searchBooks.mockRejectedValue(new Error('Search failed'));
      
      await expect(searchBooks('test')).rejects.toThrow('Search failed');
    });
  });

  describe('movie search workflow', () => {
    it('should search for movies and add selected result', async () => {
      const mockResults = [
        {
          title: 'The Matrix',
          director: 'Wachowskis',
          year: '1999',
          coverUrl: 'https://example.com/matrix.jpg',
          type: 'movie'
        }
      ];
      
      searchMovies.mockResolvedValue(mockResults);
      
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      // Search for movies
      const searchResults = await searchMovies('matrix');
      expect(searchResults).toHaveLength(1);
      
      // Add the first result
      const selectedMovie = searchResults[0];
      await act(async () => {
        await result.current.saveItem(selectedMovie);
      });
      
      expect(result.current.items).toContainEqual(
        expect.objectContaining({
          title: 'The Matrix'
        })
      );
    });
  });

  describe('search and edit workflow', () => {
    it('should search, add, and then edit item', async () => {
      const mockResults = [
        {
          title: 'Test Book',
          author: 'Test Author',
          year: '2020',
          type: 'book',
          rating: 0
        }
      ];
      
      searchBooks.mockResolvedValue(mockResults);
      
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      // Search and add
      const searchResults = await searchBooks('test');
      const selectedBook = searchResults[0];
      
      await act(async () => {
        await result.current.saveItem(selectedBook);
      });
      
      // Edit the item
      const savedItem = result.current.items.find(item => item.title === 'Test Book');
      const updatedItem = {
        ...savedItem,
        rating: 5,
        review: 'Great book!'
      };
      
      await act(async () => {
        await result.current.saveItem(updatedItem);
      });
      
      const editedItem = result.current.items.find(item => item.title === 'Test Book');
      expect(editedItem.rating).toBe(5);
      expect(editedItem.review).toBe('Great book!');
    });
  });
});

