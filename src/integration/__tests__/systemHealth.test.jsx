/**
 * System health regression tests
 *
 * These tests cover the critical end-to-end paths through the app at the hook
 * and utility layer. They are intentionally broad — if one of these breaks,
 * something fundamental has regressed. For narrow unit behavior see the
 * per-module test files.
 *
 * Critical paths covered:
 *   1. Storage → load → save → delete → undo lifecycle
 *   2. Filtering accuracy (type, search, rating, tags, status)
 *   3. Sort order correctness (title, rating, date)
 *   4. Batch edit applying changes to multiple items
 *   5. Markdown round-trip (serialize → parse produces equivalent item)
 *   6. Import pipeline (CSV parsing produces correct items)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useItems } from '../../hooks/useItems.js';
import { useFilters } from '../../hooks/useFilters.js';
import { filterItems, sortItems } from '../../utils/filterUtils.js';
import { generateMarkdown, parseMarkdown } from '../../utils/markdownUtils.js';
import { processImportFile } from '../../utils/importUtils.js';
import { StorageFactory } from '../../services/storageAdapter.js';
import { MockFileSystemStorage, createMockStorage } from '../../test/mocks/storage.js';

vi.mock('../../services/storageAdapter.js', () => ({
  StorageFactory: {
    createAdapter: vi.fn(),
    getAvailableAdapters: vi.fn(() => Promise.resolve([
      { type: 'filesystem', name: 'Local Directory', available: true }
    ]))
  }
}));

vi.mock('../../services/toastService.js', () => ({ toast: vi.fn() }));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BOOK_READ = {
  id: 'b1',
  title: 'The Great Gatsby',
  type: 'book',
  author: 'F. Scott Fitzgerald',
  year: '1925',
  rating: 5,
  status: 'read',
  tags: ['fiction', 'classic'],
  dateRead: '2024-01-15',
  review: 'A masterpiece.',
  dateAdded: '2024-01-15T00:00:00.000Z',
};

const BOOK_READING = {
  id: 'b2',
  title: 'Dune',
  type: 'book',
  author: 'Frank Herbert',
  year: '1965',
  rating: 4,
  status: 'reading',
  tags: ['sci-fi'],
  dateAdded: '2024-02-01T00:00:00.000Z',
};

const MOVIE_WATCHED = {
  id: 'm1',
  title: 'Inception',
  type: 'movie',
  director: 'Christopher Nolan',
  year: '2010',
  rating: 5,
  status: 'watched',
  tags: ['sci-fi', 'thriller'],
  dateWatched: '2024-03-10',
  dateAdded: '2024-03-10T00:00:00.000Z',
};

const MOVIE_TO_WATCH = {
  id: 'm2',
  title: 'Annihilation',
  type: 'movie',
  director: 'Alex Garland',
  year: '2018',
  rating: 3,
  status: 'to-watch',
  tags: ['sci-fi'],
  dateAdded: '2024-04-01T00:00:00.000Z',
};

const ALL_ITEMS = [BOOK_READ, BOOK_READING, MOVIE_WATCHED, MOVIE_TO_WATCH];

// ---------------------------------------------------------------------------
// 1. Storage → load → save → delete → undo lifecycle
// ---------------------------------------------------------------------------

describe('Storage lifecycle', () => {
  let storage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new MockFileSystemStorage();
    StorageFactory.createAdapter.mockResolvedValue(storage);
  });

  it('initializes, loads items, saves a new item, then retrieves it', async () => {
    const { result } = renderHook(() => useItems());

    await act(async () => { await result.current.initializeStorage('filesystem'); });
    await act(async () => { await result.current.selectStorage(); });

    expect(result.current.storageAdapter.isConnected()).toBe(true);
    expect(result.current.items).toHaveLength(0);

    const newItem = { ...BOOK_READ, id: 'new-1' };
    await act(async () => { await result.current.saveItem(newItem); });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe('The Great Gatsby');
  });

  it('saves an existing item (edit) without duplicating it', async () => {
    storage._setItems([{ ...BOOK_READ }]);
    const { result } = renderHook(() => useItems());

    await act(async () => { await result.current.initializeStorage('filesystem'); });
    await act(async () => { await result.current.selectStorage(); });
    await act(async () => { await result.current.loadItems(); });

    expect(result.current.items).toHaveLength(1);

    const edited = { ...BOOK_READ, rating: 3 };
    await act(async () => { await result.current.saveItem(edited); });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].rating).toBe(3);
  });

  it('deletes an item and pushes to undo stack', async () => {
    storage._setItems([{ ...BOOK_READ }]);
    const { result } = renderHook(() => useItems());

    await act(async () => { await result.current.initializeStorage('filesystem'); });
    await act(async () => { await result.current.selectStorage(); });
    await act(async () => { await result.current.loadItems(); });

    await act(async () => { await result.current.deleteItem(BOOK_READ); });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.undoStack).toBe(1);
  });

  it('restores a deleted item via undoLastDelete', async () => {
    storage._setItems([{ ...BOOK_READ }]);
    const { result } = renderHook(() => useItems());

    await act(async () => { await result.current.initializeStorage('filesystem'); });
    await act(async () => { await result.current.selectStorage(); });
    await act(async () => { await result.current.loadItems(); });

    await act(async () => { await result.current.deleteItem(BOOK_READ); });
    expect(result.current.items).toHaveLength(0);

    await act(async () => { await result.current.undoLastDelete(); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.undoStack).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Filtering accuracy
// ---------------------------------------------------------------------------

describe('Filter accuracy', () => {
  const baseFilters = {
    searchTerm: '',
    filterType: 'all',
    filterRating: 0,
    filterMaxRating: 0,
    filterHasReview: { withReview: true, withoutReview: true },
    filterHasCover: { withCover: true, withoutCover: true },
    filterTags: [],
    filterStatuses: [],
    filterRecent: 'any',
    filterStartDate: '',
    filterEndDate: '',
  };

  it('returns all items with default filters', () => {
    const result = filterItems(ALL_ITEMS, baseFilters);
    expect(result).toHaveLength(4);
  });

  it('filters by type: book', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterType: 'book' });
    expect(result).toHaveLength(2);
    expect(result.every(i => i.type === 'book')).toBe(true);
  });

  it('filters by type: movie', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterType: 'movie' });
    expect(result).toHaveLength(2);
    expect(result.every(i => i.type === 'movie')).toBe(true);
  });

  it('filters by search term matching title', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, searchTerm: 'inception' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
  });

  it('filters by search term matching author', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, searchTerm: 'fitzgerald' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
  });

  it('filters by minimum rating', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterRating: 5 });
    expect(result).toHaveLength(2);
    expect(result.every(i => i.rating >= 5)).toBe(true);
  });

  it('filters by single tag', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterTags: ['classic'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
  });

  it('filters by multiple tags (AND logic)', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterTags: ['sci-fi', 'thriller'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
  });

  it('filters by status', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterStatuses: ['reading'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b2');
  });

  it('filters by multiple statuses (OR logic)', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, filterStatuses: ['read', 'watched'] });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when nothing matches', () => {
    const result = filterItems(ALL_ITEMS, { ...baseFilters, searchTerm: 'xyznonexistent' });
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Sort order correctness
// ---------------------------------------------------------------------------

describe('Sort order correctness', () => {
  it('sorts by title ascending', () => {
    const result = sortItems(ALL_ITEMS, 'title', 'asc');
    const titles = result.map(i => i.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it('sorts by title descending', () => {
    const result = sortItems(ALL_ITEMS, 'title', 'desc');
    const titles = result.map(i => i.title);
    expect(titles).toEqual([...titles].sort((a, b) => b.localeCompare(a)));
  });

  it('sorts by rating descending — highest first', () => {
    const result = sortItems(ALL_ITEMS, 'rating', 'desc');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].rating ?? 0).toBeGreaterThanOrEqual(result[i].rating ?? 0);
    }
  });

  it('sorts by rating ascending — lowest first', () => {
    const result = sortItems(ALL_ITEMS, 'rating', 'asc');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].rating ?? 0).toBeLessThanOrEqual(result[i].rating ?? 0);
    }
  });

  it('preserves all items after sorting', () => {
    const result = sortItems(ALL_ITEMS, 'title', 'asc');
    expect(result).toHaveLength(ALL_ITEMS.length);
    expect(result.map(i => i.id).sort()).toEqual(ALL_ITEMS.map(i => i.id).sort());
  });
});

// ---------------------------------------------------------------------------
// 4. useFilters hook — combined filter + sort via hook
// ---------------------------------------------------------------------------

describe('useFilters hook integration', () => {
  it('returns all items initially', () => {
    const { result } = renderHook(() => useFilters(ALL_ITEMS));
    expect(result.current.filteredAndSortedItems).toHaveLength(4);
  });

  it('filters reactively when searchTerm changes', () => {
    const { result } = renderHook(() => useFilters(ALL_ITEMS));

    act(() => { result.current.setSearchTerm('dune'); });
    expect(result.current.filteredAndSortedItems).toHaveLength(1);
    expect(result.current.filteredAndSortedItems[0].id).toBe('b2');

    act(() => { result.current.setSearchTerm(''); });
    expect(result.current.filteredAndSortedItems).toHaveLength(4);
  });

  it('filters reactively when filterType changes', () => {
    const { result } = renderHook(() => useFilters(ALL_ITEMS));

    act(() => { result.current.setFilterType('movie'); });
    expect(result.current.filteredAndSortedItems.every(i => i.type === 'movie')).toBe(true);
    expect(result.current.filteredAndSortedItems).toHaveLength(2);
  });

  it('clearFilters resets all active filters', () => {
    const { result } = renderHook(() => useFilters(ALL_ITEMS));

    act(() => {
      result.current.setSearchTerm('inception');
      result.current.setFilterType('movie');
    });
    expect(result.current.filteredAndSortedItems).toHaveLength(1);

    act(() => { result.current.clearFilters(); });
    expect(result.current.filteredAndSortedItems).toHaveLength(4);
  });

  it('toggleTagFilter adds and removes tags', () => {
    const { result } = renderHook(() => useFilters(ALL_ITEMS));

    act(() => { result.current.toggleTagFilter('classic'); });
    expect(result.current.filteredAndSortedItems).toHaveLength(1);

    act(() => { result.current.toggleTagFilter('classic'); });
    expect(result.current.filteredAndSortedItems).toHaveLength(4);
  });

  it('toggleStatusFilter adds and removes statuses', () => {
    const { result } = renderHook(() => useFilters(ALL_ITEMS));

    act(() => { result.current.toggleStatusFilter('read'); });
    expect(result.current.filteredAndSortedItems).toHaveLength(1);

    act(() => { result.current.toggleStatusFilter('watched'); });
    expect(result.current.filteredAndSortedItems).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Markdown round-trip
// ---------------------------------------------------------------------------

describe('Markdown round-trip', () => {
  it('serializes a book and parses back to an equivalent item', () => {
    const item = { ...BOOK_READ };
    const md = generateMarkdown(item);

    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(0);

    const { metadata } = parseMarkdown(md);

    expect(metadata.title).toBe(item.title);
    expect(metadata.type).toBe(item.type);
    expect(metadata.author).toBe(item.author);
    expect(metadata.year).toBe(item.year);
    expect(Number(metadata.rating)).toBe(item.rating);
    expect(metadata.status).toBe(item.status);
  });

  it('serializes a movie and parses back to an equivalent item', () => {
    const item = { ...MOVIE_WATCHED };
    const md = generateMarkdown(item);
    const { metadata } = parseMarkdown(md);

    expect(metadata.title).toBe(item.title);
    expect(metadata.type).toBe(item.type);
    expect(metadata.director).toBe(item.director);
    expect(metadata.year).toBe(item.year);
  });

  it('preserves tags through round-trip', () => {
    const item = { ...BOOK_READ };
    const md = generateMarkdown(item);
    const { metadata } = parseMarkdown(md);

    expect(Array.isArray(metadata.tags)).toBe(true);
    expect(metadata.tags).toEqual(expect.arrayContaining(item.tags));
  });

  it('preserves review body through round-trip', () => {
    const item = { ...BOOK_READ };
    const md = generateMarkdown(item);
    const { body } = parseMarkdown(md);

    expect(body).toContain('masterpiece');
  });
});

// ---------------------------------------------------------------------------
// 6. Import pipeline — CSV parsing
// ---------------------------------------------------------------------------

describe('Import pipeline (CSV)', () => {
  it('parses a minimal Goodreads CSV and calls saveItem for each row', async () => {
    const csv = [
      'Book Id,Title,Author,My Rating,Date Read,Exclusive Shelf',
      '1,Test Book,Test Author,4,2024/01/15,read',
    ].join('\n');

    const file = new File([csv], 'goodreads.csv', { type: 'text/csv' });
    const savedItems = [];
    const saveItem = vi.fn(async (item) => { savedItems.push(item); return item; });

    const result = await processImportFile(file, [], saveItem, vi.fn());

    expect(saveItem).toHaveBeenCalledTimes(1);
    const saved = saveItem.mock.calls[0][0];
    expect(saved.title).toBe('Test Book');
    expect(saved.type).toBe('book');
    expect(result.added).toBe(1);
  });

  it('parses multiple rows from Goodreads CSV', async () => {
    const csv = [
      'Book Id,Title,Author,My Rating,Date Read,Exclusive Shelf',
      '1,Book One,Author A,5,2024/01/10,read',
      '2,Book Two,Author B,3,2024/02/20,read',
    ].join('\n');

    const file = new File([csv], 'goodreads.csv', { type: 'text/csv' });
    const saveItem = vi.fn(async (item) => item);

    const result = await processImportFile(file, [], saveItem, vi.fn());

    expect(saveItem).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(2);
  });

  it('skips duplicate items on import', async () => {
    const csv = [
      'Book Id,Title,Author,My Rating,Date Read,Exclusive Shelf',
      '1,Existing Book,Same Author,4,2024/01/10,read',
    ].join('\n');

    const existingItems = [{
      id: 'existing-1', title: 'Existing Book', author: 'Same Author', type: 'book'
    }];

    const file = new File([csv], 'goodreads.csv', { type: 'text/csv' });
    const saveItem = vi.fn(async (item) => item);

    const result = await processImportFile(file, existingItems, saveItem, vi.fn());

    expect(saveItem).not.toHaveBeenCalled();
    expect(result.added).toBe(0);
  });
});
