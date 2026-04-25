/**
 * Custom assertion helpers for common test patterns
 */

import { expect } from 'vitest';

/**
 * Assert that an item has required fields
 */
export function expectValidItem(item) {
  expect(item).toBeDefined();
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('title');
  expect(item).toHaveProperty('type');
  expect(['book', 'movie']).toContain(item.type);
}

/**
 * Assert that an item is a valid book
 */
export function expectValidBook(item) {
  expectValidItem(item);
  expect(item.type).toBe('book');
  if (item.author !== undefined) {
    expect(typeof item.author).toBe('string');
  }
}

/**
 * Assert that an item is a valid movie
 */
export function expectValidMovie(item) {
  expectValidItem(item);
  expect(item.type).toBe('movie');
  if (item.director !== undefined) {
    expect(typeof item.director).toBe('string');
  }
}

/**
 * Assert that a markdown string has valid YAML frontmatter
 */
export function expectValidMarkdown(markdown) {
  expect(typeof markdown).toBe('string');
  expect(markdown).toContain('---');
  
  const parts = markdown.split('---');
  expect(parts.length).toBeGreaterThanOrEqual(2);
  
  // Check that frontmatter exists
  const frontmatter = parts[1];
  expect(frontmatter.length).toBeGreaterThan(0);
}

/**
 * Assert that a storage adapter implements required methods
 */
export function expectValidStorageAdapter(adapter) {
  expect(adapter).toHaveProperty('isConnected');
  expect(adapter).toHaveProperty('getStorageType');
  expect(adapter).toHaveProperty('getStorageInfo');
  expect(adapter).toHaveProperty('loadItems');
  expect(adapter).toHaveProperty('saveItem');
  expect(adapter).toHaveProperty('deleteItem');
  expect(adapter).toHaveProperty('restoreItem');
  
  expect(typeof adapter.isConnected).toBe('function');
  expect(typeof adapter.getStorageType).toBe('function');
  expect(typeof adapter.getStorageInfo).toBe('function');
  expect(typeof adapter.loadItems).toBe('function');
  expect(typeof adapter.saveItem).toBe('function');
  expect(typeof adapter.deleteItem).toBe('function');
  expect(typeof adapter.restoreItem).toBe('function');
}

/**
 * Assert that progress callback was called with valid progress
 */
export function expectValidProgress(progress) {
  expect(progress).toHaveProperty('processed');
  expect(progress).toHaveProperty('total');
  expect(typeof progress.processed).toBe('number');
  expect(typeof progress.total).toBe('number');
  expect(progress.processed).toBeGreaterThanOrEqual(0);
  expect(progress.total).toBeGreaterThanOrEqual(0);
  expect(progress.processed).toBeLessThanOrEqual(progress.total);
}

/**
 * Assert that an error is a valid API error
 */
export function expectValidApiError(error, errorType = null) {
  expect(error).toBeInstanceOf(Error);
  if (errorType) {
    expect(error.constructor.name).toBe(errorType);
  }
  expect(error.message).toBeDefined();
  expect(typeof error.message).toBe('string');
}

/**
 * Assert that a CSV row has required fields
 */
export function expectValidCSVRow(row, requiredFields = []) {
  expect(row).toBeDefined();
  expect(typeof row).toBe('object');
  
  requiredFields.forEach(field => {
    expect(row).toHaveProperty(field);
  });
}

/**
 * Assert that a date string is in YYYY-MM-DD format
 */
export function expectValidDateString(dateString) {
  expect(typeof dateString).toBe('string');
  expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * Assert that a rating is valid (0-5, or 0-5 in 0.5 increments)
 */
export function expectValidRating(rating, allowHalfStars = false) {
  expect(typeof rating).toBe('number');
  expect(rating).toBeGreaterThanOrEqual(0);
  expect(rating).toBeLessThanOrEqual(5);
  
  if (!allowHalfStars) {
    expect(Number.isInteger(rating)).toBe(true);
  } else {
    // Should be multiple of 0.5
    expect(rating * 2 % 1).toBe(0);
  }
}

/**
 * Assert that tags array is valid
 */
export function expectValidTags(tags) {
  expect(Array.isArray(tags)).toBe(true);
  tags.forEach(tag => {
    expect(typeof tag).toBe('string');
    expect(tag.length).toBeGreaterThan(0);
  });
}

/**
 * Assert that a status is valid for the given type
 */
export function expectValidStatus(status, type) {
  expect(typeof status).toBe('string');
  
  const validStatuses = {
    book: ['to-read', 'reading', 'read', 'dnf'],
    movie: ['to-watch', 'watching', 'watched', 'dnf']
  };
  
  expect(validStatuses[type]).toContain(status);
}

/**
 * Assert that a storage info object is valid
 */
export function expectValidStorageInfo(storageInfo) {
  expect(storageInfo).toBeDefined();
  expect(typeof storageInfo).toBe('object');
  expect(storageInfo).toHaveProperty('folder');
  expect(typeof storageInfo.folder).toBe('string');
}

/**
 * Assert that a file has valid properties
 */
export function expectValidFile(file) {
  expect(file).toBeInstanceOf(File);
  expect(file.name).toBeDefined();
  expect(typeof file.name).toBe('string');
  expect(file.type).toBeDefined();
  expect(typeof file.type).toBe('string');
}

/**
 * Assert that a mock function was called with specific arguments
 */
export function expectCalledWith(mockFn, ...args) {
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn).toHaveBeenCalledWith(...args);
}

/**
 * Assert that a mock function was called at least N times
 */
export function expectCalledAtLeast(mockFn, minCalls) {
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(minCalls);
}

/**
 * Assert that a mock function was called at most N times
 */
export function expectCalledAtMost(mockFn, maxCalls) {
  if (mockFn.mock.calls.length > 0) {
    expect(mockFn.mock.calls.length).toBeLessThanOrEqual(maxCalls);
  }
}

/**
 * Assert that an array contains unique items
 */
export function expectUniqueItems(items, keyFn = (item) => item.id) {
  const keys = items.map(keyFn);
  const uniqueKeys = new Set(keys);
  expect(keys.length).toBe(uniqueKeys.size);
}

/**
 * Assert that two items are duplicates
 */
export function expectDuplicates(item1, item2, type = 'book') {
  expect(item1.title.toLowerCase().trim()).toBe(item2.title.toLowerCase().trim());
  
  if (type === 'book') {
    expect(item1.author?.toLowerCase().trim()).toBe(item2.author?.toLowerCase().trim());
  } else {
    expect(item1.director?.toLowerCase().trim()).toBe(item2.director?.toLowerCase().trim());
  }
}

