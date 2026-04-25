/**
 * Mock helper functions for creating test data and mocks
 */

import { vi } from 'vitest';
import { sampleBook, sampleMovie, sampleBookUnrated, sampleMovieWatchlist } from '../fixtures/sampleItems.js';

/**
 * Create a mock storage adapter
 */
export function createMockStorageAdapter(overrides = {}) {
  const items = [...(overrides.items || [])];
  
  return {
    isConnected: vi.fn(() => overrides.connected !== false),
    initialize: vi.fn().mockResolvedValue(true),
    getStorageType: vi.fn(() => overrides.type || 'filesystem'),
    getStorageInfo: vi.fn(() => overrides.storageInfo || { account: null, folder: 'Test Directory' }),
    selectStorage: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    loadItems: vi.fn((progressCallback) => {
      if (progressCallback) {
        progressCallback({ processed: items.length, total: items.length, items });
      }
      return Promise.resolve(items);
    }),
    saveItem: vi.fn((item) => {
      const index = items.findIndex(i => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      return Promise.resolve(item);
    }),
    deleteItem: vi.fn((item) => {
      const index = items.findIndex(i => i.id === item.id);
      if (index >= 0) {
        items.splice(index, 1);
      }
      return Promise.resolve({ item, index });
    }),
    restoreItem: vi.fn((undoInfo) => {
      items.splice(undoInfo.index, 0, undoInfo.item);
      return Promise.resolve(undoInfo.item);
    }),
    writeFile: vi.fn().mockResolvedValue(true),
    fileExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(''),
    ...overrides
  };
}

/**
 * Create a mock Google Drive storage adapter
 */
export function createMockGoogleDriveStorage(overrides = {}) {
  return createMockStorageAdapter({
    type: 'googledrive',
    storageInfo: { account: 'test@example.com', folder: 'MarkdownMediaTracker' },
    ...overrides
  });
}

/**
 * Create mock items for testing
 */
export function createMockItems(count = 5, type = 'book') {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    title: `${type === 'book' ? 'Book' : 'Movie'} ${i + 1}`,
    type,
    author: type === 'book' ? `Author ${i + 1}` : undefined,
    director: type === 'movie' ? `Director ${i + 1}` : undefined,
    status: type === 'book' ? 'read' : 'watched',
    rating: (i % 5) + 1,
    year: String(2000 + i),
    tags: [`tag-${i + 1}`],
    dateAdded: `2024-01-${String(i + 1).padStart(2, '0')}`
  }));
}

/**
 * Create a mock book item
 */
export function createMockBook(overrides = {}) {
  return {
    ...sampleBook,
    ...overrides
  };
}

/**
 * Create a mock movie item
 */
export function createMockMovie(overrides = {}) {
  return {
    ...sampleMovie,
    ...overrides
  };
}

/**
 * Create a mock API response
 */
export function createMockApiResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
    clone: vi.fn()
  };
}

/**
 * Create a mock fetch function
 */
export function createMockFetch(responses = {}) {
  return vi.fn((url) => {
    const response = responses[url] || responses['*'] || {
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('')
    };
    
    if (typeof response === 'function') {
      return Promise.resolve(response(url));
    }
    
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      json: vi.fn().mockResolvedValue(response.json || {}),
      text: vi.fn().mockResolvedValue(response.text || ''),
      headers: new Headers(response.headers || {}),
      clone: vi.fn()
    });
  });
}

/**
 * Create a mock fetch that throws an error
 */
export function createMockFetchError(error = new Error('Network error')) {
  return vi.fn(() => Promise.reject(error));
}

/**
 * Create a mock progress callback
 */
export function createMockProgressCallback() {
  const calls = [];
  const callback = (progress) => {
    calls.push(progress);
  };
  callback.calls = calls;
  callback.lastCall = () => calls[calls.length - 1];
  callback.callCount = () => calls.length;
  return callback;
}

/**
 * Create a mock onAPIError callback
 */
export function createMockOnAPIError() {
  return vi.fn().mockResolvedValue({ continue: true, skipEnrichment: false });
}

/**
 * Create a mock AbortSignal
 */
export function createMockAbortSignal(aborted = false) {
  return {
    aborted,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onabort: null,
    reason: null,
    throwIfAborted: vi.fn(() => {
      if (aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
    })
  };
}

/**
 * Create a mock File object
 */
export function createMockFile(content, filename, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const file = new File([blob], filename, { type });
  return file;
}

/**
 * Create a mock CSV file
 */
export function createMockCSVFile(rows, filename = 'test.csv') {
  const headers = Object.keys(rows[0] || {});
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(header => row[header] || '').join(','))
  ].join('\n');
  
  return createMockFile(csvContent, filename, 'text/csv');
}

/**
 * Create a mock ZIP file
 */
export function createMockZipFile(files, filename = 'test.zip') {
  // In tests, we'll mock JSZip, so this just creates a File object
  const blob = new Blob(['zip content'], { type: 'application/zip' });
  return new File([blob], filename, { type: 'application/zip' });
}

/**
 * Create mock localStorage
 */
export function createMockLocalStorage() {
  const store = {};
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    _store: store // For test inspection
  };
}

/**
 * Create mock IndexedDB
 */
export function createMockIndexedDB() {
  const databases = {};
  
  return {
    open: vi.fn((name) => {
      if (!databases[name]) {
        databases[name] = {
          objectStores: {},
          version: 1
        };
      }
      return Promise.resolve({
        result: databases[name],
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      });
    }),
    deleteDatabase: vi.fn((name) => {
      delete databases[name];
      return Promise.resolve();
    }),
    _databases: databases // For test inspection
  };
}

/**
 * Create a mock toast function
 */
export function createMockToast() {
  const calls = [];
  const toast = vi.fn((message, options = {}) => {
    calls.push({ message, options });
  });
  toast.calls = calls;
  toast.lastCall = () => calls[calls.length - 1];
  toast.callCount = () => calls.length;
  return toast;
}

/**
 * Create a mock event
 */
export function createMockEvent(type, properties = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  return event;
}

/**
 * Create a mock keyboard event
 */
export function createMockKeyboardEvent(key, options = {}) {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
}

/**
 * Create a mock mouse event
 */
export function createMockMouseEvent(type = 'click', options = {}) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options
  });
}

