import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchMovies, isServiceAvailable, validateApiKey, TMDBError } from '../tmdbService.js';

vi.mock('../../config.js', () => ({
  getConfig: vi.fn((key) => {
    if (key === 'tmdbApiKey') return 'test-tmdb-key';
    return '';
  }),
  hasTmdbApiKey: vi.fn(() => true),
}));

// Minimal movie fixture from /search/multi
const makeMovie = (id, title, year = '2010') => ({
  id,
  media_type: 'movie',
  title,
  release_date: `${year}-01-01`,
  poster_path: `/poster${id}.jpg`,
  popularity: 100,
});

const makeCredits = (director = 'Test Director', actors = ['Actor One', 'Actor Two']) => ({
  crew: [{ job: 'Director', name: director }],
  cast: actors.map((name, i) => ({ name, order: i })),
});

describe('tmdbService', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TMDBError', () => {
    it('should construct with type and statusCode', () => {
      const err = new TMDBError('msg', 'AUTH_FAILED', 401);
      expect(err.name).toBe('TMDBError');
      expect(err.type).toBe('AUTH_FAILED');
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('msg');
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when TMDB key is set', () => {
      expect(isServiceAvailable()).toBe(true);
    });
  });

  describe('validateApiKey', () => {
    it('should return true when API responds ok', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true });
      expect(await validateApiKey('test-key')).toBe(true);
    });

    it('should return false when API responds with error', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false });
      expect(await validateApiKey('bad-key')).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network'));
      expect(await validateApiKey('test-key')).toBe(false);
    });

    it('should return false when no key provided and config key is empty', async () => {
      const { hasTmdbApiKey, getConfig } = await import('../../config.js');
      hasTmdbApiKey.mockReturnValueOnce(false);
      getConfig.mockReturnValueOnce('');
      expect(await validateApiKey('')).toBe(false);
    });
  });

  describe('searchMovies', () => {
    it('should throw on empty query', async () => {
      await expect(searchMovies('')).rejects.toThrow('Query cannot be empty');
      await expect(searchMovies('  ')).rejects.toThrow('Query cannot be empty');
    });

    it('should throw TMDBError AUTH_FAILED on 401', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
      try {
        await searchMovies('Inception');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(TMDBError);
        expect(e.type).toBe('AUTH_FAILED');
      }
    });

    it('should throw TMDBError RATE_LIMIT on 429', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 429 });
      await expect(searchMovies('Inception')).rejects.toMatchObject({ type: 'RATE_LIMIT' });
    });

    it('should throw TMDBError NETWORK on other HTTP errors', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(searchMovies('Inception')).rejects.toMatchObject({ type: 'NETWORK' });
    });

    it('should return empty array when no results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });
      const results = await searchMovies('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('should return title-match movies with credits fetched', async () => {
      const movie = makeMovie(1, 'Inception', '2010');
      const credits = makeCredits('Christopher Nolan', ['Leonardo DiCaprio', 'Tom Hardy']);

      // multi search → credits for movie 1
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [movie] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => credits });

      const results = await searchMovies('Inception');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Inception');
      expect(results[0].director).toBe('Christopher Nolan');
      expect(results[0].actors).toContain('Leonardo DiCaprio');
      expect(results[0].year).toBe('2010');
      expect(results[0].coverUrl).toContain('/poster1.jpg');
      expect(results[0].tmdbID).toBe(1);
    });

    it('should merge person known_for movies first when a person is matched', async () => {
      const knownForMovie = makeMovie(10, 'The Dark Knight', '2008');
      const titleMovie = makeMovie(20, 'Dark City', '1998');
      const person = {
        id: 525,
        media_type: 'person',
        name: 'Christopher Nolan',
        known_for_department: 'Directing',
        popularity: 200,
        known_for: [{ ...knownForMovie, media_type: 'movie' }, { ...knownForMovie, media_type: 'movie' }, { ...knownForMovie, media_type: 'movie' }],
      };

      const multiResponse = { results: [person, titleMovie] };
      const credits10 = makeCredits('Christopher Nolan');
      const credits20 = makeCredits('Alex Proyas');

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => multiResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => credits10 })  // credits for movie 10
        .mockResolvedValueOnce({ ok: true, json: async () => credits20 }); // credits for movie 20

      const results = await searchMovies('Christopher Nolan');

      // Person's movie comes first
      expect(results[0].tmdbID).toBe(10);
      expect(results[0]._personMatch).toBe('Christopher Nolan');
      expect(results[0]._matchedAs).toBe('director');

      // Title match comes after
      expect(results[1].tmdbID).toBe(20);
      expect(results[1]._personMatch).toBeUndefined();
    });

    it('should fetch full credits when known_for has fewer than 3 entries', async () => {
      const knownForMovie = makeMovie(10, 'Inception', '2010');
      const person = {
        id: 525,
        media_type: 'person',
        name: 'Christopher Nolan',
        known_for_department: 'Directing',
        popularity: 200,
        known_for: [{ ...knownForMovie, media_type: 'movie' }], // only 1 — sparse
      };

      const fullCreditsMovie = makeMovie(11, 'The Dark Knight', '2008');
      const fullCreditsMovie2 = makeMovie(12, 'Interstellar', '2014');

      const movieCredits = {
        crew: [
          { job: 'Director', title: 'The Dark Knight', ...fullCreditsMovie, popularity: 90 },
          { job: 'Director', title: 'Interstellar', ...fullCreditsMovie2, popularity: 85 },
        ],
        cast: [],
      };

      fetchMock
        // multi search
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [person] }) })
        // full movie_credits for person
        .mockResolvedValueOnce({ ok: true, json: async () => movieCredits })
        // credits for each movie in result
        .mockResolvedValue({ ok: true, json: async () => makeCredits('Christopher Nolan') });

      const results = await searchMovies('Christopher Nolan');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]._personMatch).toBe('Christopher Nolan');
    });

    it('should set _matchedAs actor for person with Acting department', async () => {
      const knownForMovie = { ...makeMovie(30, 'Cast Away', '2000'), media_type: 'movie' };
      const person = {
        id: 31,
        media_type: 'person',
        name: 'Tom Hanks',
        known_for_department: 'Acting',
        popularity: 150,
        known_for: [knownForMovie, knownForMovie, knownForMovie],
      };

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [person] }) })
        .mockResolvedValue({ ok: true, json: async () => makeCredits() });

      const results = await searchMovies('Tom Hanks');
      expect(results[0]._matchedAs).toBe('actor');
    });

    it('should deduplicate movies appearing in both person known_for and title results', async () => {
      const sharedMovie = makeMovie(42, 'Inception', '2010');
      const person = {
        id: 525,
        media_type: 'person',
        name: 'Christopher Nolan',
        known_for_department: 'Directing',
        popularity: 200,
        known_for: [{ ...sharedMovie, media_type: 'movie' }, { ...sharedMovie, media_type: 'movie' }, { ...sharedMovie, media_type: 'movie' }],
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [person, sharedMovie] }),
        })
        .mockResolvedValue({ ok: true, json: async () => makeCredits() });

      const results = await searchMovies('Christopher Nolan');
      const ids = results.map((r) => r.tmdbID);
      expect(ids.filter((id) => id === 42)).toHaveLength(1);
    });

    it('should cap results at limit', async () => {
      const movies = Array.from({ length: 20 }, (_, i) => makeMovie(i + 1, `Movie ${i + 1}`));
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: movies }) })
        .mockResolvedValue({ ok: true, json: async () => makeCredits() });

      const results = await searchMovies('test', 5);
      expect(results).toHaveLength(5);
    });

    it('should handle credits fetch failure gracefully', async () => {
      const movie = makeMovie(1, 'Inception');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [movie] }) })
        .mockRejectedValueOnce(new Error('credits network error'));

      const results = await searchMovies('Inception');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Inception');
      expect(results[0].director).toBe(''); // graceful fallback
    });

    it('should handle missing poster_path', async () => {
      const movie = { ...makeMovie(1, 'Inception'), poster_path: null };
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [movie] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => makeCredits() });

      const results = await searchMovies('Inception');
      expect(results[0].coverUrl).toBeNull();
    });
  });
});
