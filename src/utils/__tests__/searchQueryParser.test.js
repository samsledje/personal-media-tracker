import { describe, it, expect } from 'vitest';
import {
  parseSearchQuery,
  generateSearchVariations,
  scoreMovieMatch,
  filterAndRankResults
} from '../searchQueryParser.js';

describe('searchQueryParser', () => {
  describe('parseSearchQuery', () => {
    it('should handle empty or invalid input', () => {
      expect(parseSearchQuery('')).toMatchObject({
        original: '',
        titleKeywords: [],
        searchType: 'title'
      });
      expect(parseSearchQuery(null)).toMatchObject({
        original: '',
        titleKeywords: []
      });
      expect(parseSearchQuery(undefined)).toMatchObject({
        original: '',
        titleKeywords: []
      });
    });

    it('should parse simple title search', () => {
      const result = parseSearchQuery('The Matrix');
      expect(result.searchType).toBe('title');
      expect(result.titleKeywords).toEqual(['The Matrix']);
      expect(result.director).toBeNull();
      expect(result.actor).toBeNull();
      expect(result.year).toBeNull();
    });

    it('should parse title with year', () => {
      const result = parseSearchQuery('The Matrix 1999');
      expect(result.searchType).toBe('title');
      expect(result.titleKeywords[0]).toContain('Matrix');
      expect(result.year).toBe('1999');
    });

    it('should parse director search with "directed by"', () => {
      const result = parseSearchQuery('Inception directed by Christopher Nolan');
      expect(result.searchType).toBe('director');
      expect(result.director).toBe('Christopher Nolan');
      expect(result.titleKeywords).toEqual(['Inception']);
    });

    it('should parse director search with "by"', () => {
      const result = parseSearchQuery('Inception by Christopher Nolan');
      expect(result.searchType).toBe('director');
      expect(result.director).toBe('Christopher Nolan');
      expect(result.titleKeywords).toEqual(['Inception']);
    });

    it('should parse director search with "director"', () => {
      const result = parseSearchQuery('director Christopher Nolan');
      expect(result.searchType).toBe('director');
      expect(result.director).toBe('Christopher Nolan');
    });

    it('should parse director search with year', () => {
      const result = parseSearchQuery('Inception directed by Christopher Nolan 2010');
      expect(result.searchType).toBe('director');
      expect(result.director).toBe('Christopher Nolan');
      expect(result.year).toBe('2010');
    });

    it('should parse actor search with "starring"', () => {
      const result = parseSearchQuery('The Matrix starring Keanu Reeves');
      expect(result.searchType).toBe('actor');
      expect(result.actor).toBe('Keanu Reeves');
      expect(result.titleKeywords).toEqual(['The Matrix']);
    });

    it('should parse actor search with "with"', () => {
      const result = parseSearchQuery('Matrix with Keanu Reeves');
      expect(result.searchType).toBe('actor');
      expect(result.actor).toBe('Keanu Reeves');
      expect(result.titleKeywords).toEqual(['Matrix']);
    });

    it('should parse actor search with "actor"', () => {
      const result = parseSearchQuery('actor Tom Hanks');
      expect(result.searchType).toBe('actor');
      expect(result.actor).toBe('Tom Hanks');
    });

    it('should detect series searches', () => {
      const result = parseSearchQuery('Matrix series');
      expect(result.isSeries).toBe(true);
      expect(result.searchType).toBe('title');
    });

    it('should parse year range', () => {
      const result = parseSearchQuery('Matrix 1999-2003');
      expect(result.yearRange).toEqual({ start: '1999', end: '2003' });
      expect(result.year).toBeNull();
    });

    it('should parse year range with "to"', () => {
      const result = parseSearchQuery('Matrix 1999 to 2003');
      expect(result.yearRange).toEqual({ start: '1999', end: '2003' });
    });

    it('should prioritize director over actor', () => {
      const result = parseSearchQuery('Inception directed by Nolan starring DiCaprio');
      expect(result.searchType).toBe('director');
      expect(result.director).toBe('Nolan starring DiCaprio');
      expect(result.actor).toBeNull();
    });
  });

  describe('generateSearchVariations', () => {
    it('should return empty array for invalid input', () => {
      expect(generateSearchVariations(null)).toEqual([]);
      expect(generateSearchVariations(undefined)).toEqual([]);
    });

    it('should include original query', () => {
      const parsed = parseSearchQuery('The Matrix');
      const variations = generateSearchVariations(parsed);
      expect(variations).toContain('The Matrix');
    });

    it('should generate variations for director search', () => {
      const parsed = parseSearchQuery('Inception by Christopher Nolan');
      const variations = generateSearchVariations(parsed);
      expect(variations).toContain('Inception by Christopher Nolan');
      expect(variations).toContain('Inception');
    });

    it('should generate variations for search with year', () => {
      const parsed = parseSearchQuery('The Matrix 1999');
      const variations = generateSearchVariations(parsed);
      expect(variations.length).toBeGreaterThan(0);
      expect(variations[0]).toBeTruthy();
    });

    it('should not include duplicates', () => {
      const parsed = parseSearchQuery('Matrix');
      const variations = generateSearchVariations(parsed);
      const uniqueVariations = [...new Set(variations)];
      expect(variations.length).toBe(uniqueVariations.length);
    });
  });

  describe('scoreMovieMatch', () => {
    const testMovie = {
      title: 'Inception',
      director: 'Christopher Nolan',
      actors: ['Leonardo DiCaprio', 'Tom Hardy', 'Ellen Page'],
      year: '2010'
    };

    it('should return 0 for invalid input', () => {
      expect(scoreMovieMatch(null, null)).toBe(0);
      expect(scoreMovieMatch(testMovie, null)).toBe(0);
      expect(scoreMovieMatch(null, parseSearchQuery('test'))).toBe(0);
    });

    it('should score exact year match highly', () => {
      const parsed = parseSearchQuery('Inception 2010');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(20);
    });

    it('should penalize year mismatch', () => {
      const parsed = parseSearchQuery('Inception 2020');
      const score = scoreMovieMatch(testMovie, parsed);
      const correctYearParsed = parseSearchQuery('Inception 2010');
      const correctScore = scoreMovieMatch(testMovie, correctYearParsed);
      // Score with wrong year should be less than score with correct year
      expect(score).toBeLessThan(correctScore);
    });

    it('should score exact director match highly', () => {
      const parsed = parseSearchQuery('director Christopher Nolan');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThanOrEqual(40);
    });

    it('should score partial director match', () => {
      const parsed = parseSearchQuery('director Nolan');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(25);
    });

    it('should score last name director match', () => {
      const parsed = parseSearchQuery('director Nolan');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(0);
    });

    it('should score exact actor match highly', () => {
      const parsed = parseSearchQuery('actor Leonardo DiCaprio');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThanOrEqual(35);
    });

    it('should score partial actor match', () => {
      const parsed = parseSearchQuery('actor DiCaprio');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(0);
    });

    it('should score actor last name match', () => {
      const parsed = parseSearchQuery('actor Hardy');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(0);
    });

    it('should penalize missing actor', () => {
      const parsed = parseSearchQuery('actor Brad Pitt');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeLessThan(20);
    });

    it('should score title match', () => {
      const parsed = parseSearchQuery('Inception');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(0);
    });

    it('should give bonus for exact title match', () => {
      const parsed = parseSearchQuery('Inception');
      const exactScore = scoreMovieMatch(testMovie, parsed);
      
      const partialMovie = { ...testMovie, title: 'Inception Extended' };
      const partialScore = scoreMovieMatch(partialMovie, parsed);
      
      expect(exactScore).toBeGreaterThan(partialScore);
    });

    it('should handle year ranges', () => {
      const parsed = parseSearchQuery('movies 2008 to 2012');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(0);
    });

    it('should combine multiple criteria', () => {
      const parsed = parseSearchQuery('Inception directed by Nolan 2010');
      const score = scoreMovieMatch(testMovie, parsed);
      expect(score).toBeGreaterThan(60);
    });
  });

  describe('filterAndRankResults', () => {
    const movies = [
      {
        title: 'Inception',
        director: 'Christopher Nolan',
        actors: ['Leonardo DiCaprio'],
        year: '2010'
      },
      {
        title: 'The Dark Knight',
        director: 'Christopher Nolan',
        actors: ['Christian Bale'],
        year: '2008'
      },
      {
        title: 'Interstellar',
        director: 'Christopher Nolan',
        actors: ['Matthew McConaughey'],
        year: '2014'
      },
      {
        title: 'The Matrix',
        director: 'Wachowski Brothers',
        actors: ['Keanu Reeves'],
        year: '1999'
      }
    ];

    it('should return empty array for invalid input', () => {
      expect(filterAndRankResults(null, null)).toEqual([]);
      expect(filterAndRankResults([], null)).toEqual([]);
      expect(filterAndRankResults(undefined, null)).toEqual([]);
    });

    it('should return original movies if no parsed query', () => {
      const result = filterAndRankResults(movies, null);
      expect(result).toEqual(movies);
    });

    it('should filter by director', () => {
      const parsed = parseSearchQuery('director Christopher Nolan');
      const result = filterAndRankResults(movies, parsed);
      
      // All Nolan movies should be ranked higher
      expect(result[0].director).toBe('Christopher Nolan');
      expect(result[1].director).toBe('Christopher Nolan');
      expect(result[2].director).toBe('Christopher Nolan');
    });

    it('should filter by year', () => {
      const parsed = parseSearchQuery('movie 2010');
      const result = filterAndRankResults(movies, parsed);
      
      // 2010 movie should be first
      expect(result[0].year).toBe('2010');
    });

    it('should filter by actor', () => {
      const parsed = parseSearchQuery('actor Leonardo DiCaprio');
      const result = filterAndRankResults(movies, parsed);
      
      // DiCaprio movie should be first
      expect(result[0].actors).toContain('Leonardo DiCaprio');
    });

    it('should add relevance scores to results', () => {
      const parsed = parseSearchQuery('director Nolan');
      const result = filterAndRankResults(movies, parsed);
      
      expect(result[0]._relevanceScore).toBeDefined();
      expect(typeof result[0]._relevanceScore).toBe('number');
    });

    it('should sort by relevance score descending', () => {
      const parsed = parseSearchQuery('director Christopher Nolan 2010');
      const result = filterAndRankResults(movies, parsed);
      
      // Scores should be in descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1]._relevanceScore).toBeGreaterThanOrEqual(result[i]._relevanceScore);
      }
    });

    it('should respect minScore threshold', () => {
      const parsed = parseSearchQuery('director Christopher Nolan');
      const result = filterAndRankResults(movies, parsed, 30);
      
      // All results should have score >= 30
      result.forEach(movie => {
        expect(movie._relevanceScore).toBeGreaterThanOrEqual(30);
      });
      
      // Should filter out non-Nolan movies
      expect(result.length).toBeLessThan(movies.length);
    });
  });

  describe('author search parsing', () => {
    it('should parse "author Name" query', () => {
      const result = parseSearchQuery('author J.K. Rowling');
      expect(result.searchType).toBe('author');
      expect(result.author).toBe('J.K. Rowling');
      expect(result.titleKeywords).toEqual([]);
    });

    it('should parse "Title author Name" query', () => {
      const result = parseSearchQuery('Harry Potter author Rowling');
      expect(result.searchType).toBe('author');
      expect(result.author).toBe('Rowling');
      expect(result.titleKeywords).toEqual(['Harry Potter']);
    });

    it('should parse "written by Name" query', () => {
      const result = parseSearchQuery('written by George Orwell');
      expect(result.searchType).toBe('author');
      expect(result.author).toBe('George Orwell');
    });

    it('should include author field as null for non-author queries', () => {
      const result = parseSearchQuery('Inception');
      expect(result.author).toBeNull();
    });
  });

  describe('generateSearchVariations for director/actor-only (no title)', () => {
    it('should return just the person name for director-only query', () => {
      const parsed = parseSearchQuery('director Christopher Nolan');
      const variations = generateSearchVariations(parsed);
      expect(variations).toEqual(['Christopher Nolan']);
      expect(variations).not.toContain('director Christopher Nolan');
    });

    it('should return just the person name for actor-only query', () => {
      const parsed = parseSearchQuery('actor Tom Hanks');
      const variations = generateSearchVariations(parsed);
      expect(variations).toEqual(['Tom Hanks']);
      expect(variations).not.toContain('actor Tom Hanks');
    });

    it('should still include original + title for director+title query', () => {
      const parsed = parseSearchQuery('Inception by Christopher Nolan');
      const variations = generateSearchVariations(parsed);
      expect(variations).toContain('Inception by Christopher Nolan');
      expect(variations).toContain('Inception');
    });
  });
});
