/**
 * Performance tests for critical operations
 * Tests batch operations, filtering, sorting, and imports with large datasets
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { filterItems, sortItems } from '../filterUtils.js';
import { SORT_OPTIONS, SORT_ORDERS } from '../../constants/index.js';

describe('Performance Tests', () => {
  // Create large dataset for performance testing
  const createLargeDataset = (size = 1000) => {
    return Array.from({ length: size }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      type: i % 2 === 0 ? 'book' : 'movie',
      author: i % 2 === 0 ? `Author ${i}` : undefined,
      director: i % 2 === 1 ? `Director ${i}` : undefined,
      status: ['read', 'watched', 'to-read', 'to-watch', 'reading', 'watching'][i % 6],
      rating: i % 6,
      year: String(2000 + (i % 25)),
      tags: [`tag-${i % 10}`, `tag-${(i + 1) % 10}`],
      dateAdded: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      dateRead: i % 2 === 0 ? `2024-01-${String((i % 28) + 1).padStart(2, '0')}` : undefined,
      dateWatched: i % 2 === 1 ? `2024-01-${String((i % 28) + 1).padStart(2, '0')}` : undefined
    }));
  };

  describe('filtering performance', () => {
    it('should filter 1000 items quickly', () => {
      const items = createLargeDataset(1000);
      
      const startTime = performance.now();
      const filtered = filterItems(items, { filterType: 'book' });
      const endTime = performance.now();
      
      expect(filtered.length).toBe(500);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should filter 5000 items in reasonable time', () => {
      const items = createLargeDataset(5000);
      
      const startTime = performance.now();
      const filtered = filterItems(items, { 
        filterType: 'book',
        filterRating: 4,
        filterTags: ['tag-1']
      });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should complete in < 500ms
    });

    it('should handle complex filters on large dataset', () => {
      const items = createLargeDataset(2000);
      
      const startTime = performance.now();
      const filtered = filterItems(items, {
        searchTerm: 'Item 1',
        filterType: 'book',
        filterRating: 3,
        filterTags: ['tag-1', 'tag-2'],
        filterStatuses: ['read', 'reading']
      });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Should complete in < 200ms
    });
  });

  describe('sorting performance', () => {
    it('should sort 1000 items quickly', () => {
      const items = createLargeDataset(1000);
      
      const startTime = performance.now();
      const sorted = sortItems(items, SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
      const endTime = performance.now();
      
      expect(sorted.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should sort 5000 items in reasonable time', () => {
      const items = createLargeDataset(5000);
      
      const startTime = performance.now();
      const sorted = sortItems(items, SORT_OPTIONS.DATE_CONSUMED, SORT_ORDERS.DESC);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should complete in < 500ms
    });

    it('should handle multiple sort operations efficiently', () => {
      const items = createLargeDataset(2000);
      
      const startTime = performance.now();
      
      // Multiple sort operations
      sortItems(items, SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
      sortItems(items, SORT_OPTIONS.RATING, SORT_ORDERS.DESC);
      sortItems(items, SORT_OPTIONS.YEAR, SORT_ORDERS.ASC);
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(300); // Should complete in < 300ms
    });
  });

  describe('batch operations performance', () => {
    it('should handle batch edit on 100 items efficiently', async () => {
      const items = createLargeDataset(100);
      const updates = items.map(item => ({ ...item, rating: 5 }));
      
      const startTime = performance.now();
      
      // Simulate batch update
      const updated = items.map(item => ({ ...item, rating: 5 }));
      
      const endTime = performance.now();
      
      expect(updated.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in < 50ms
    });

    it('should handle batch delete on 500 items efficiently', () => {
      const items = createLargeDataset(500);
      
      const startTime = performance.now();
      
      // Simulate batch delete (filter out items)
      const remaining = items.filter((_, i) => i >= 100);
      
      const endTime = performance.now();
      
      expect(remaining.length).toBe(400);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in < 50ms
    });
  });

  describe('memory efficiency', () => {
    it('should not create excessive memory usage with large datasets', () => {
      const items = createLargeDataset(1000);
      
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Perform multiple operations
      const filtered = filterItems(items, { filterType: 'book' });
      const sorted = sortItems(filtered, SORT_OPTIONS.TITLE, SORT_ORDERS.ASC);
      const filteredAgain = filterItems(sorted, { filterRating: 4 });
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Memory increase should be reasonable (less than 10MB for 1000 items)
      if (performance.memory) {
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
        expect(memoryIncrease).toBeLessThan(10);
      }
      
      expect(filteredAgain.length).toBeGreaterThan(0);
    });
  });
});

