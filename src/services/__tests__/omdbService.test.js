import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchMovies, OMDBError } from '../omdbService.js';

// Mock the config module
vi.mock('../../config.js', () => ({
  getConfig: vi.fn(() => 'test-api-key'),
  hasApiKey: vi.fn(() => true),
}));

describe('omdbService', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('searchMovies', () => {
    it('should throw error for empty query', async () => {
      await expect(searchMovies('')).rejects.toThrow('Query cannot be empty');
      await expect(searchMovies('   ')).rejects.toThrow('Query cannot be empty');
    });

    it('should throw error when API key is missing', async () => {
      const { hasApiKey } = await import('../../config.js');
      hasApiKey.mockReturnValueOnce(false);
      
      await expect(searchMovies('matrix')).rejects.toThrow('API_KEY_MISSING');
    });

    it('should search for movies successfully', async () => {
      global.fetch = vi.fn()
        // First call: search
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999' },
              { imdbID: 'tt0234215', Title: 'The Matrix Reloaded', Year: '2003' }
            ]
          })
        })
        // Second call: details for first movie
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Title: 'The Matrix',
            Year: '1999',
            Director: 'Wachowski Brothers',
            Genre: 'Action, Sci-Fi',
            Plot: 'A computer hacker learns about the true nature of reality.',
            Poster: 'https://example.com/matrix.jpg',
            imdbRating: '8.7'
          })
        })
        // Third call: details for second movie
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Title: 'The Matrix Reloaded',
            Year: '2003',
            Director: 'Wachowski Brothers',
            Genre: 'Action, Sci-Fi',
            Plot: 'Neo and his allies fight against the machines.',
            Poster: 'https://example.com/reloaded.jpg',
            imdbRating: '7.2'
          })
        });
      
      const results = await searchMovies('matrix');
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('The Matrix');
      expect(results[0].year).toBe('1999');
      expect(results[0].director).toBe('Wachowski Brothers');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle 401 authentication errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      
      await expect(searchMovies('matrix')).rejects.toThrow(OMDBError);
      await expect(searchMovies('matrix')).rejects.toThrow('authentication failed');
    });

    it('should handle 429 rate limit errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });
      
      await expect(searchMovies('matrix')).rejects.toThrow(OMDBError);
      await expect(searchMovies('matrix')).rejects.toThrow('rate limit');
    });

    it('should handle invalid API key from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Response: 'False',
          Error: 'Invalid API key!'
        })
      });
      
      await expect(searchMovies('matrix')).rejects.toThrow(OMDBError);
      await expect(searchMovies('matrix')).rejects.toThrow('Invalid OMDb API key');
    });

    it('should handle daily quota exceeded', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Response: 'False',
          Error: 'Request limit reached!'
        })
      });
      
      await expect(searchMovies('matrix')).rejects.toThrow(OMDBError);
      await expect(searchMovies('matrix')).rejects.toThrow('daily limit');
    });

    it('should return empty array for no results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Response: 'False',
          Error: 'Movie not found!'
        })
      });
      
      const results = await searchMovies('xyzabc123nonexistent');
      
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt1', Title: 'Movie 1', Year: '2020' },
              { imdbID: 'tt2', Title: 'Movie 2', Year: '2021' },
              { imdbID: 'tt3', Title: 'Movie 3', Year: '2022' },
            ]
          })
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ Title: 'Test', Year: '2020', Director: 'Test', Actors: 'Actor 1' })
        });
      
      const results = await searchMovies('test', 2);

      expect(results).toHaveLength(2);
      // Enhanced search may try multiple variations, so just verify we got results
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should include &y= year param in search URL for title+year query', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [{ imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999' }]
          })
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            Title: 'The Matrix', Year: '1999', Director: 'Wachowski', Actors: 'Keanu Reeves',
            Poster: 'N/A', imdbRating: '8.7', imdbID: 'tt0133093'
          })
        });

      await searchMovies('The Matrix 1999');

      const firstCall = global.fetch.mock.calls[0][0];
      expect(firstCall).toContain('y=1999');
    });

    it('should NOT include &y= for plain title query without year', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [{ imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999' }]
          })
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            Title: 'The Matrix', Year: '1999', Director: 'Wachowski', Actors: 'Keanu Reeves',
            Poster: 'N/A', imdbRating: '8.7', imdbID: 'tt0133093'
          })
        });

      await searchMovies('The Matrix');

      const firstCall = global.fetch.mock.calls[0][0];
      expect(firstCall).not.toContain('&y=');
    });
  });
});
