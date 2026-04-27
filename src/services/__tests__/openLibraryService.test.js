import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchBooks, OpenLibraryError } from '../openLibraryService.js';

describe('openLibraryService', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('searchBooks', () => {
    it('should throw error for empty query', async () => {
      await expect(searchBooks('')).rejects.toThrow('Query cannot be empty');
      await expect(searchBooks('   ')).rejects.toThrow('Query cannot be empty');
    });

    it('should search for books successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/OL456W',
              title: 'The Great Gatsby',
              author_name: ['F. Scott Fitzgerald'],
              first_publish_year: 1925,
              cover_i: 12345,
              editions: {
                docs: [
                  { isbn: ['9780743273565', '0743273567'] }
                ]
              }
            },
            {
              key: '/works/OL789W',
              title: 'To Kill a Mockingbird',
              author_name: ['Harper Lee'],
              first_publish_year: 1960,
              cover_i: 67890,
              editions: {
                docs: [
                  { isbn: ['9780061120084'] }
                ]
              }
            }
          ]
        })
      });
      
      const results = await searchBooks('gatsby');
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('The Great Gatsby');
      expect(results[0].author).toBe('F. Scott Fitzgerald');
      expect(results[0].year).toBe(1925);
      expect(results[0].isbn).toBe('9780743273565'); // Should prefer ISBN-13
      expect(results[0].coverUrl).toContain('12345');
      expect(results[0].type).toBe('book');
    });

    it('should handle books without ISBN', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'Ancient Book',
              author_name: ['Unknown Author'],
              first_publish_year: 1800,
              cover_i: null,
              editions: { docs: [] }
            }
          ]
        })
      });
      
      const results = await searchBooks('ancient');
      
      expect(results).toHaveLength(1);
      expect(results[0].isbn).toBeNull();
      expect(results[0].coverUrl).toBeNull();
    });

    it('should handle missing author', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'Anonymous Work',
              first_publish_year: 2020
            }
          ]
        })
      });
      
      const results = await searchBooks('anonymous');
      
      expect(results[0].author).toBe('Unknown Author');
    });

    it('should handle 500 server errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503
      });
      
      await expect(searchBooks('gatsby')).rejects.toThrow(OpenLibraryError);
      await expect(searchBooks('gatsby')).rejects.toThrow('service is temporarily unavailable');
    });

    it('should handle other HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });
      
      await expect(searchBooks('gatsby')).rejects.toThrow(OpenLibraryError);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        Object.assign(new TypeError('fetch failed'), { message: 'fetch failed' })
      );
      
      await expect(searchBooks('gatsby')).rejects.toThrow(OpenLibraryError);
      await expect(searchBooks('gatsby')).rejects.toThrow('Unable to connect to Open Library');
    });

    it('should handle generic errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Something went wrong'));
      
      await expect(searchBooks('gatsby')).rejects.toThrow(OpenLibraryError);
      await expect(searchBooks('gatsby')).rejects.toThrow('Error searching for books');
    });

    it('should handle empty results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      });
      
      const results = await searchBooks('nonexistent book xyz123');
      
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: Array.from({ length: 20 }, (_, i) => ({
            title: `Book ${i + 1}`,
            author_name: ['Author'],
            first_publish_year: 2020
          }))
        })
      });
      
      const results = await searchBooks('test', 5);
      
      expect(results).toHaveLength(5);
    });

    it('should prefer ISBN-13 over ISBN-10', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'Test Book',
              author_name: ['Test Author'],
              editions: {
                docs: [
                  { isbn: ['0123456789', '9780123456789'] } // ISBN-10 first, ISBN-13 second
                ]
              }
            }
          ]
        })
      });
      
      const results = await searchBooks('test');

      expect(results[0].isbn).toBe('9780123456789'); // Should pick ISBN-13
    });

    it('should use author: field query for "author Name" searches', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [{ key: '/works/OL1W', title: '1984', author_name: ['George Orwell'], first_publish_year: 1949 }]
        })
      });

      await searchBooks('author George Orwell');

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('author%3AGeorge%20Orwell');
    });

    it('should use author: field query for "Title by Author" searches', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [{ key: '/works/OL2W', title: '1984', author_name: ['George Orwell'], first_publish_year: 1949 }]
        })
      });

      await searchBooks('1984 by George Orwell');

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('author%3AGeorge%20Orwell');
    });
  });
});
