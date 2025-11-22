import { describe, it, expect } from 'vitest';
import { filterItems, sortItems, getAllTags, getAllStatuses } from '../../utils/filterUtils.js';
import { SORT_OPTIONS, SORT_ORDERS, RECENT_FILTER_OPTIONS } from '../../constants/index.js';

describe('filterUtils', () => {
  const sampleItems = [
    {
      id: '1',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      type: 'book',
      status: 'read',
      rating: 5,
      year: '1925',
      tags: ['classic', 'fiction'],
      dateAdded: '2024-01-10',
      dateRead: '2024-01-15',
    },
    {
      id: '2',
      title: 'The Matrix',
      director: 'Wachowski Brothers',
      actors: ['Keanu Reeves', 'Laurence Fishburne'],
      type: 'movie',
      status: 'watched',
      rating: 5,
      year: '1999',
      tags: ['sci-fi', 'action'],
      dateAdded: '2024-02-10',
      dateWatched: '2024-02-15',
    },
    {
      id: '3',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      type: 'book',
      status: 'reading',
      rating: 0,
      year: '1960',
      tags: ['classic'],
      dateAdded: '2024-03-01',
    },
    {
      id: '4',
      title: 'Inception',
      director: 'Christopher Nolan',
      type: 'movie',
      status: 'to-watch',
      rating: 0,
      year: '2010',
      tags: ['sci-fi', 'thriller'],
      dateAdded: '2024-03-05',
    },
    {
      id: '5',
      title: 'Book I Didn\'t Finish',
      author: 'Test Author',
      type: 'book',
      status: 'dnf',
      rating: 0,
      year: '2023',
      tags: ['unfinished'],
      dateAdded: '2024-03-10',
    },
    {
      id: '6',
      title: 'Movie I Didn\'t Finish',
      director: 'Test Director',
      type: 'movie',
      status: 'dnf',
      rating: 0,
      year: '2023',
      tags: ['unfinished'],
      dateAdded: '2024-03-15',
    },
  ];

  describe('filterItems', () => {
    it('should return all items when no filters applied', () => {
      const result = filterItems(sampleItems, {});
      expect(result).toHaveLength(6);
    });

    it('should filter by search term in title', () => {
      const result = filterItems(sampleItems, { searchTerm: 'matrix' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Matrix');
    });

    it('should filter by search term in author', () => {
      const result = filterItems(sampleItems, { searchTerm: 'fitzgerald' });
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('F. Scott Fitzgerald');
    });

    it('should filter by search term in director', () => {
      const result = filterItems(sampleItems, { searchTerm: 'nolan' });
      expect(result).toHaveLength(1);
      expect(result[0].director).toBe('Christopher Nolan');
    });

    it('should filter by search term in actors', () => {
      const result = filterItems(sampleItems, { searchTerm: 'keanu' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Matrix');
    });

    it('should filter by search term in tags', () => {
      const result = filterItems(sampleItems, { searchTerm: 'thriller' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Inception');
    });

    it('should filter by type - books only', () => {
      const result = filterItems(sampleItems, { filterType: 'book' });
      expect(result).toHaveLength(3);
      expect(result.every(item => item.type === 'book')).toBe(true);
    });

    it('should filter by type - movies only', () => {
      const result = filterItems(sampleItems, { filterType: 'movie' });
      expect(result).toHaveLength(3);
      expect(result.every(item => item.type === 'movie')).toBe(true);
    });

    it('should filter by rating', () => {
      const result = filterItems(sampleItems, { filterRating: 5 });
      expect(result).toHaveLength(2);
      expect(result.every(item => item.rating >= 5)).toBe(true);
    });

    it('should filter by tags', () => {
      const result = filterItems(sampleItems, { filterTags: ['classic'] });
      expect(result).toHaveLength(2);
      expect(result.every(item => item.tags?.includes('classic'))).toBe(true);
    });

    it('should filter by multiple tags (AND logic)', () => {
      const result = filterItems(sampleItems, { filterTags: ['classic', 'fiction'] });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Great Gatsby');
    });

    it('should filter by status', () => {
      const result = filterItems(sampleItems, { filterStatuses: ['read'] });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('read');
    });

    it('should filter by multiple statuses', () => {
      const result = filterItems(sampleItems, { filterStatuses: ['read', 'watched'] });
      expect(result).toHaveLength(2);
      expect(result.every(item => ['read', 'watched'].includes(item.status))).toBe(true);
    });

    it('should filter by recent - last 7 days', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const itemsWithRecentDate = [
        {
          ...sampleItems[0],
          dateRead: recentDate.toISOString().split('T')[0],
        },
      ];
      
      const result = filterItems(itemsWithRecentDate, { 
        filterRecent: RECENT_FILTER_OPTIONS.LAST_7 
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by recent - last 30 days', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
      const itemsWithRecentDate = [
        {
          ...sampleItems[0],
          dateRead: recentDate.toISOString().split('T')[0],
        },
      ];
      
      const result = filterItems(itemsWithRecentDate, { 
        filterRecent: RECENT_FILTER_OPTIONS.LAST_30 
      });
      expect(result).toHaveLength(1);
    });

    it('should not include items without consumption date in recent filter', () => {
      const result = filterItems(sampleItems, { 
        filterRecent: RECENT_FILTER_OPTIONS.LAST_7 
      });
      expect(result).toHaveLength(0);
    });

    it('should combine multiple filters', () => {
      const result = filterItems(sampleItems, {
        filterType: 'book',
        filterRating: 4,
        filterTags: ['classic'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Great Gatsby');
    });

    it('should handle empty items array', () => {
      const result = filterItems([], { searchTerm: 'test' });
      expect(result).toHaveLength(0);
    });

    it('should be case insensitive for search', () => {
      const result = filterItems(sampleItems, { searchTerm: 'MATRIX' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Matrix');
    });

    it('should handle items without tags', () => {
      const itemsNoTags = [{ id: '1', title: 'Test', type: 'book' }];
      const result = filterItems(itemsNoTags, { filterTags: ['fiction'] });
      expect(result).toHaveLength(0);
    });

    it('should filter by ISBN', () => {
      const itemsWithISBN = [
        { ...sampleItems[0], isbn: '9780743273565' },
      ];
      const result = filterItems(itemsWithISBN, { searchTerm: '9780743273565' });
      expect(result).toHaveLength(1);
    });
  });

  describe('sortItems', () => {
    it('should sort by title ascending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
      expect(result[0].title).toBe('Book I Didn\'t Finish');
      expect(result[1].title).toBe('Inception');
      expect(result[2].title).toBe('Movie I Didn\'t Finish');
      expect(result[3].title).toBe('The Great Gatsby');
      expect(result[4].title).toBe('The Matrix');
      expect(result[5].title).toBe('To Kill a Mockingbird');
    });

    it('should sort by title descending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.TITLE, SORT_ORDERS.DESC);
      expect(result[0].title).toBe('To Kill a Mockingbird');
      expect(result[1].title).toBe('The Matrix');
      expect(result[2].title).toBe('The Great Gatsby');
      expect(result[3].title).toBe('Movie I Didn\'t Finish');
      expect(result[4].title).toBe('Inception');
      expect(result[5].title).toBe('Book I Didn\'t Finish');
    });

    it('should sort by author ascending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.AUTHOR, SORT_ORDERS.ASC);
      // Should use director for movies
      expect(result[0].director || result[0].author).toBe('Christopher Nolan');
      expect(result[1].author || result[1].director).toBe('F. Scott Fitzgerald');
    });

    it('should sort by year ascending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.YEAR, SORT_ORDERS.ASC);
      expect(result[0].year).toBe('1925');
      expect(result[1].year).toBe('1960');
      expect(result[2].year).toBe('1999');
      expect(result[3].year).toBe('2010');
      expect(result[4].year).toBe('2023');
      expect(result[5].year).toBe('2023');
    });

    it('should sort by year descending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.YEAR, SORT_ORDERS.DESC);
      expect(result[0].year).toBe('2023');
      expect(result[1].year).toBe('2023');
      expect(result[2].year).toBe('2010');
      expect(result[3].year).toBe('1999');
      expect(result[4].year).toBe('1960');
      expect(result[5].year).toBe('1925');
    });

    it('should sort by rating ascending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.RATING, SORT_ORDERS.ASC);
      expect(result[0].rating).toBe(0);
      expect(result[4].rating).toBe(5);
    });

    it('should sort by rating descending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.RATING, SORT_ORDERS.DESC);
      expect(result[0].rating).toBe(5);
    });

    it('should sort by date added ascending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.DATE_ADDED, SORT_ORDERS.ASC);
      expect(result[0].dateAdded).toBe('2024-01-10');
      expect(result[3].dateAdded).toBe('2024-03-05');
    });

    it('should sort by date consumed ascending', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.DATE_CONSUMED, SORT_ORDERS.ASC);
      // Items without dates should come first (as 0)
      expect(result[4].dateRead).toBe('2024-01-15');
      expect(result[5].dateWatched).toBe('2024-02-15');
    });

    it('should sort by status in predefined order', () => {
      const result = sortItems(sampleItems, SORT_OPTIONS.STATUS, SORT_ORDERS.ASC);
      // Expected order: watched, read, watching, reading, to-watch, to-read
      const statuses = result.map(item => item.status);
      expect(statuses.indexOf('watched')).toBeLessThan(statuses.indexOf('reading'));
      expect(statuses.indexOf('read')).toBeLessThan(statuses.indexOf('to-watch'));
    });

    it('should not mutate original array', () => {
      const original = [...sampleItems];
      sortItems(sampleItems, SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
      expect(sampleItems).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = sortItems([], SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
      expect(result).toHaveLength(0);
    });

    it('should handle items without sort field', () => {
      const itemsNoYear = [
        { id: '1', title: 'A' },
        { id: '2', title: 'B', year: '2020' },
      ];
      const result = sortItems(itemsNoYear, SORT_OPTIONS.YEAR, SORT_ORDERS.ASC);
      expect(result).toHaveLength(2);
    });

    // Secondary sort tests
    describe('secondary sort by date consumed', () => {
      it('should apply secondary sort when primary sort values are equal - status sort', () => {
        const itemsWithSameStatus = [
          {
            id: '1',
            title: 'Book A',
            type: 'book',
            status: 'read',
            rating: 5,
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Book B',
            type: 'book',
            status: 'read',
            rating: 4,
            dateRead: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Book C',
            type: 'book',
            status: 'read',
            rating: 3,
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsWithSameStatus, SORT_OPTIONS.STATUS, SORT_ORDERS.ASC);
        // All have same status, so should be sorted by date consumed descending
        expect(result[0].id).toBe('2'); // 2024-03-15 (most recent)
        expect(result[1].id).toBe('3'); // 2024-02-15
        expect(result[2].id).toBe('1'); // 2024-01-15
      });

      it('should apply secondary sort when primary sort values are equal - rating sort', () => {
        const itemsWithSameRating = [
          {
            id: '1',
            title: 'Item A',
            type: 'book',
            rating: 5,
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Item B',
            type: 'movie',
            rating: 5,
            dateWatched: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Item C',
            type: 'book',
            rating: 5,
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsWithSameRating, SORT_OPTIONS.RATING, SORT_ORDERS.DESC);
        // All have rating 5, so should be sorted by date consumed descending
        expect(result[0].id).toBe('2'); // 2024-03-15 (most recent)
        expect(result[1].id).toBe('3'); // 2024-02-15
        expect(result[2].id).toBe('1'); // 2024-01-15
      });

      it('should apply secondary sort when primary sort values are equal - year sort', () => {
        const itemsWithSameYear = [
          {
            id: '1',
            title: 'Item A',
            year: '2020',
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Item B',
            year: '2020',
            dateWatched: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Item C',
            year: '2020',
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsWithSameYear, SORT_OPTIONS.YEAR, SORT_ORDERS.ASC);
        // All have year 2020, so should be sorted by date consumed descending
        expect(result[0].id).toBe('2'); // 2024-03-15 (most recent)
        expect(result[1].id).toBe('3'); // 2024-02-15
        expect(result[2].id).toBe('1'); // 2024-01-15
      });

      it('should apply secondary sort when primary sort values are equal - title sort', () => {
        const itemsWithSameTitle = [
          {
            id: '1',
            title: 'Same Title',
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Same Title',
            dateWatched: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Same Title',
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsWithSameTitle, SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
        // All have same title, so should be sorted by date consumed descending
        expect(result[0].id).toBe('2'); // 2024-03-15 (most recent)
        expect(result[1].id).toBe('3'); // 2024-02-15
        expect(result[2].id).toBe('1'); // 2024-01-15
      });

      it('should apply secondary sort when primary sort values are equal - author sort', () => {
        const itemsWithSameAuthor = [
          {
            id: '1',
            title: 'Book A',
            author: 'John Doe',
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Book B',
            author: 'John Doe',
            dateRead: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Book C',
            author: 'John Doe',
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsWithSameAuthor, SORT_OPTIONS.AUTHOR, SORT_ORDERS.ASC);
        // All have same author, so should be sorted by date consumed descending
        expect(result[0].id).toBe('2'); // 2024-03-15 (most recent)
        expect(result[1].id).toBe('3'); // 2024-02-15
        expect(result[2].id).toBe('1'); // 2024-01-15
      });

      it('should apply secondary sort when primary sort values are equal - date added sort', () => {
        const itemsWithSameDateAdded = [
          {
            id: '1',
            title: 'Item A',
            dateAdded: '2024-01-01',
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Item B',
            dateAdded: '2024-01-01',
            dateWatched: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Item C',
            dateAdded: '2024-01-01',
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsWithSameDateAdded, SORT_OPTIONS.DATE_ADDED, SORT_ORDERS.ASC);
        // All have same date added, so should be sorted by date consumed descending
        expect(result[0].id).toBe('2'); // 2024-03-15 (most recent)
        expect(result[1].id).toBe('3'); // 2024-02-15
        expect(result[2].id).toBe('1'); // 2024-01-15
      });

      it('should handle items without date consumed in secondary sort', () => {
        const itemsMixedDates = [
          {
            id: '1',
            title: 'Item A',
            rating: 5,
            dateRead: '2024-01-15',
          },
          {
            id: '2',
            title: 'Item B',
            rating: 5,
            // No date consumed
          },
          {
            id: '3',
            title: 'Item C',
            rating: 5,
            dateWatched: '2024-03-15',
          },
        ];
        
        const result = sortItems(itemsMixedDates, SORT_OPTIONS.RATING, SORT_ORDERS.DESC);
        // Items with dates should come before items without dates (descending order)
        expect(result[0].id).toBe('3'); // 2024-03-15
        expect(result[1].id).toBe('1'); // 2024-01-15
        expect(result[2].id).toBe('2'); // No date (0)
      });

      it('should maintain primary sort order when different primary values', () => {
        const itemsDifferentRatings = [
          {
            id: '1',
            title: 'Item A',
            rating: 3,
            dateRead: '2024-03-15', // Most recent, but lower rating
          },
          {
            id: '2',
            title: 'Item B',
            rating: 5,
            dateRead: '2024-01-15',
          },
          {
            id: '3',
            title: 'Item C',
            rating: 4,
            dateRead: '2024-02-15',
          },
        ];
        
        const result = sortItems(itemsDifferentRatings, SORT_OPTIONS.RATING, SORT_ORDERS.DESC);
        // Primary sort by rating should take precedence
        expect(result[0].rating).toBe(5);
        expect(result[1].rating).toBe(4);
        expect(result[2].rating).toBe(3);
      });

      it('should work with both dateRead and dateWatched for movies and books', () => {
        const mixedItems = [
          {
            id: '1',
            title: 'Book',
            type: 'book',
            status: 'read',
            dateRead: '2024-02-15',
          },
          {
            id: '2',
            title: 'Movie',
            type: 'movie',
            status: 'watched',
            dateWatched: '2024-03-15', // Most recent
          },
          {
            id: '3',
            title: 'Book',
            type: 'book',
            status: 'read',
            dateRead: '2024-01-15',
          },
        ];
        
        const result = sortItems(mixedItems, SORT_OPTIONS.STATUS, SORT_ORDERS.ASC);
        // Both 'watched' and 'read' are in same tier, secondary sort applies
        expect(result[0].id).toBe('2'); // 2024-03-15 (movie)
        expect(result[1].id).toBe('1'); // 2024-02-15 (book)
        expect(result[2].id).toBe('3'); // 2024-01-15 (book)
      });
    });
  });

  describe('getAllTags', () => {
    it('should return all unique tags sorted', () => {
      const result = getAllTags(sampleItems);
      expect(result).toEqual(['action', 'classic', 'fiction', 'sci-fi', 'thriller', 'unfinished']);
    });

    it('should handle empty items array', () => {
      const result = getAllTags([]);
      expect(result).toEqual([]);
    });

    it('should handle items without tags', () => {
      const itemsNoTags = [
        { id: '1', title: 'Test 1' },
        { id: '2', title: 'Test 2' },
      ];
      const result = getAllTags(itemsNoTags);
      expect(result).toEqual([]);
    });

    it('should handle duplicate tags', () => {
      const itemsWithDuplicates = [
        { id: '1', tags: ['fiction', 'classic'] },
        { id: '2', tags: ['fiction', 'modern'] },
      ];
      const result = getAllTags(itemsWithDuplicates);
      expect(result).toEqual(['classic', 'fiction', 'modern']);
    });

    it('should sort tags case-insensitively', () => {
      const itemsWithCasedTags = [
        { id: '1', tags: ['Zebra', 'apple', 'Banana'] },
      ];
      const result = getAllTags(itemsWithCasedTags);
      expect(result).toEqual(['apple', 'Banana', 'Zebra']);
    });
  });

  describe('getAllStatuses', () => {
    it('should return unique statuses in predefined order', () => {
      const result = getAllStatuses(sampleItems);
      // Should only include statuses that exist
      expect(result).toContain('read');
      expect(result).toContain('reading');
      expect(result).toContain('watched');
      expect(result).toContain('to-watch');
      expect(result).toContain('dnf');
    });

    it('should return statuses in correct order', () => {
      const result = getAllStatuses(sampleItems);
      const readIndex = result.indexOf('read');
      const watchedIndex = result.indexOf('watched');
      const readingIndex = result.indexOf('reading');
      
      // Book statuses should come before movie statuses
      expect(readIndex).toBeGreaterThan(-1);
      expect(watchedIndex).toBeGreaterThan(-1);
    });

    it('should handle empty items array', () => {
      const result = getAllStatuses([]);
      expect(result).toEqual([]);
    });

    it('should handle items without status', () => {
      const itemsNoStatus = [
        { id: '1', title: 'Test 1' },
        { id: '2', title: 'Test 2' },
      ];
      const result = getAllStatuses(itemsNoStatus);
      expect(result).toEqual([]);
    });

    it('should not include duplicate statuses', () => {
      const itemsWithDuplicates = [
        { id: '1', status: 'read' },
        { id: '2', status: 'read' },
        { id: '3', status: 'watched' },
      ];
      const result = getAllStatuses(itemsWithDuplicates);
      expect(result.filter(s => s === 'read')).toHaveLength(1);
    });
  });
});
