import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchMovies, OMDBError } from '../omdbService.js';

// Mock the config module
vi.mock('../../config.js', () => ({
  getConfig: vi.fn(() => 'test-api-key'),
  hasApiKey: vi.fn(() => true),
}));

describe('omdbService - Enhanced Search', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Director Search', () => {
    it('should search by director name', async () => {
      const nolanMovies = [
        {
          imdbID: 'tt1375666',
          Title: 'Inception',
          Year: '2010',
          Director: 'Christopher Nolan',
          Actors: 'Leonardo DiCaprio, Tom Hardy',
          Poster: 'http://example.com/inception.jpg',
          imdbRating: '8.8'
        },
        {
          imdbID: 'tt0468569',
          Title: 'The Dark Knight',
          Year: '2008',
          Director: 'Christopher Nolan',
          Actors: 'Christian Bale, Heath Ledger',
          Poster: 'http://example.com/dk.jpg',
          imdbRating: '9.0'
        }
      ];

      global.fetch = vi.fn()
        // First search for "director Christopher Nolan" (searches just "Christopher Nolan")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt1375666', Title: 'Inception', Year: '2010' },
              { imdbID: 'tt0468569', Title: 'The Dark Knight', Year: '2008' }
            ]
          })
        })
        // Detail call for Inception
        .mockResolvedValueOnce({
          ok: true,
          json: async () => nolanMovies[0]
        })
        // Detail call for The Dark Knight
        .mockResolvedValueOnce({
          ok: true,
          json: async () => nolanMovies[1]
        });

      const results = await searchMovies('director Christopher Nolan');

      expect(results.length).toBeGreaterThan(0);
      // Results should be filtered/ranked by director match
      const topResult = results[0];
      expect(topResult.director).toContain('Nolan');
    });

    it('should search by director with partial name', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt1375666', Title: 'Inception', Year: '2010' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt1375666',
            Title: 'Inception',
            Year: '2010',
            Director: 'Christopher Nolan',
            Actors: 'Leonardo DiCaprio',
            Poster: 'http://example.com/inception.jpg',
            imdbRating: '8.8'
          })
        });

      const results = await searchMovies('director Nolan');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].director).toContain('Nolan');
    });

    it('should search with "directed by" syntax', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt1375666', Title: 'Inception', Year: '2010' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt1375666',
            Title: 'Inception',
            Year: '2010',
            Director: 'Christopher Nolan',
            Actors: 'Leonardo DiCaprio',
            Poster: 'N/A',
            imdbRating: '8.8'
          })
        });

      const results = await searchMovies('Inception directed by Nolan');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Actor Search', () => {
    it('should search by actor name', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0133093',
            Title: 'The Matrix',
            Year: '1999',
            Director: 'Wachowski Brothers',
            Actors: 'Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss',
            Poster: 'http://example.com/matrix.jpg',
            imdbRating: '8.7'
          })
        });

      const results = await searchMovies('actor Keanu Reeves');

      expect(results.length).toBeGreaterThan(0);
      const hasKeanu = results.some(movie => 
        movie.actors && movie.actors.some(actor => actor.includes('Reeves'))
      );
      expect(hasKeanu).toBe(true);
    });

    it('should search with "starring" syntax', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt0468569', Title: 'The Dark Knight', Year: '2008' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0468569',
            Title: 'The Dark Knight',
            Year: '2008',
            Director: 'Christopher Nolan',
            Actors: 'Christian Bale, Heath Ledger, Aaron Eckhart',
            Poster: 'http://example.com/dk.jpg',
            imdbRating: '9.0'
          })
        });

      const results = await searchMovies('Dark Knight starring Heath Ledger');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by actor last name', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt0816692', Title: 'Interstellar', Year: '2014' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0816692',
            Title: 'Interstellar',
            Year: '2014',
            Director: 'Christopher Nolan',
            Actors: 'Matthew McConaughey, Anne Hathaway, Jessica Chastain',
            Poster: 'N/A',
            imdbRating: '8.6'
          })
        });

      const results = await searchMovies('actor McConaughey');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Year-based Search', () => {
    it('should filter by year', async () => {
      global.fetch = vi.fn()
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
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0133093',
            Title: 'The Matrix',
            Year: '1999',
            Director: 'Wachowski Brothers',
            Actors: 'Keanu Reeves',
            Poster: 'http://example.com/matrix.jpg',
            imdbRating: '8.7'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0234215',
            Title: 'The Matrix Reloaded',
            Year: '2003',
            Director: 'Wachowski Brothers',
            Actors: 'Keanu Reeves',
            Poster: 'http://example.com/reloaded.jpg',
            imdbRating: '7.2'
          })
        });

      const results = await searchMovies('Matrix 1999');

      expect(results.length).toBeGreaterThan(0);
      // 1999 movie should be ranked higher
      const first1999Index = results.findIndex(m => m.year === '1999');
      const first2003Index = results.findIndex(m => m.year === '2003');
      
      if (first1999Index >= 0 && first2003Index >= 0) {
        expect(first1999Index).toBeLessThan(first2003Index);
      }
    });

    it('should handle year ranges', async () => {
      global.fetch = vi.fn()
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
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0133093',
            Title: 'The Matrix',
            Year: '1999',
            Director: 'Wachowski Brothers',
            Actors: 'Keanu Reeves',
            Poster: 'N/A',
            imdbRating: '8.7'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0234215',
            Title: 'The Matrix Reloaded',
            Year: '2003',
            Director: 'Wachowski Brothers',
            Actors: 'Keanu Reeves',
            Poster: 'N/A',
            imdbRating: '7.2'
          })
        });

      const results = await searchMovies('Matrix 1999-2003');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Series/Franchise Search', () => {
    it('should handle series keywords', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt0133093',
            Title: 'The Matrix',
            Year: '1999',
            Director: 'Wachowski Brothers',
            Actors: 'Keanu Reeves',
            Poster: 'N/A',
            imdbRating: '8.7'
          })
        });

      const results = await searchMovies('Matrix series');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Criteria', () => {
    it('should handle director and year together', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt1375666', Title: 'Inception', Year: '2010' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt1375666',
            Title: 'Inception',
            Year: '2010',
            Director: 'Christopher Nolan',
            Actors: 'Leonardo DiCaprio',
            Poster: 'N/A',
            imdbRating: '8.8'
          })
        });

      const results = await searchMovies('Inception directed by Nolan 2010');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].year).toBe('2010');
      expect(results[0].director).toContain('Nolan');
    });
  });

  describe('Fuzzy Search Integration', () => {
    it('should fall back to fuzzy search when exact search fails', async () => {
      global.fetch = vi.fn()
        // Original search - no results
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'False',
            Error: 'Movie not found!'
          })
        })
        // Fuzzy alternative - has results
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Response: 'True',
            Search: [
              { imdbID: 'tt1375666', Title: 'Inception', Year: '2010' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imdbID: 'tt1375666',
            Title: 'Inception',
            Year: '2010',
            Director: 'Christopher Nolan',
            Actors: 'Leonardo DiCaprio',
            Poster: 'N/A',
            imdbRating: '8.8'
          })
        });

      const results = await searchMovies('Inceptoin'); // Misspelling

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]._fuzzySearch).toBe(true);
    });
  });
});
