import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileSystemCache } from '../fileSystemCache.js';

// Simplified IndexedDB mock for fileSystemCache testing
function createMockIndexedDB() {
  const data = new Map();
  let dbInstance = null;
  
  const mockStore = {
    _data: data,
    put: vi.fn((value) => {
      const request = {
        onsuccess: null,
        onerror: null
      };
      setTimeout(() => {
        data.set(value.id || 'current', value);
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    }),
    get: vi.fn((key) => {
      const request = {
        result: null,
        onsuccess: null,
        onerror: null
      };
      setTimeout(() => {
        request.result = data.get(key) || undefined;
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    }),
    delete: vi.fn((key) => {
      const request = {
        onsuccess: null,
        onerror: null
      };
      setTimeout(() => {
        data.delete(key);
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    }),
    createIndex: vi.fn(() => ({})),
    index: vi.fn(() => ({}))
  };
  
  const mockTransaction = {
    objectStore: vi.fn(() => mockStore),
    oncomplete: null,
    onerror: null,
    error: null,
    _pendingOperations: 0,
    _completedOperations: 0,
    _triggerComplete: () => {
      mockTransaction._completedOperations++;
      if (mockTransaction._pendingOperations === mockTransaction._completedOperations && mockTransaction.oncomplete) {
        setTimeout(() => {
          mockTransaction.oncomplete({ target: mockTransaction });
        }, 10);
      }
    }
  };
  
  // Wrap put to track operations
  const originalPut = mockStore.put;
  mockStore.put = vi.fn((value) => {
    const request = originalPut(value);
    mockTransaction._pendingOperations++;
    
    // Track completion
    const originalOnSuccess = request.onsuccess;
    request.onsuccess = (event) => {
      if (originalOnSuccess) {
        originalOnSuccess(event);
      }
      setTimeout(() => {
        mockTransaction._triggerComplete();
      }, 1);
    };
    
    return request;
  });
  
  // Wrap delete to track operations
  const originalDelete = mockStore.delete;
  mockStore.delete = vi.fn((key) => {
    const request = originalDelete(key);
    mockTransaction._pendingOperations++;
    
    // Track completion
    const originalOnSuccess = request.onsuccess;
    request.onsuccess = (event) => {
      if (originalOnSuccess) {
        originalOnSuccess(event);
      }
      setTimeout(() => {
        mockTransaction._triggerComplete();
      }, 1);
    };
    
    return request;
  });
  
  let mockDB = {
    transaction: vi.fn(() => {
      // Reset counters for each transaction
      mockTransaction._pendingOperations = 0;
      mockTransaction._completedOperations = 0;
      return mockTransaction;
    }),
    createObjectStore: vi.fn(() => mockStore),
    objectStoreNames: {
      contains: vi.fn(() => false)
    }
  };
  
  // Store reference to mockDB for error handling tests
  const mockIndexedDB = {
    open: vi.fn((dbName, version) => {
      const request = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      
      setTimeout(() => {
        if (!dbInstance) {
          dbInstance = mockDB;
          // Trigger onupgradeneeded to create store
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: { result: dbInstance } });
          }
        }
        request.result = dbInstance;
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      
      return request;
    }),
    _data: data,
    _getStore: () => mockStore,
    _getDB: () => mockDB
  };
  
  return mockIndexedDB;
}

describe('fileSystemCache', () => {
  let mockIndexedDB;
  let originalIndexedDB;
  let mockDB;
  
  beforeEach(async () => {
    originalIndexedDB = global.indexedDB;
    mockIndexedDB = createMockIndexedDB();
    global.indexedDB = mockIndexedDB;
    fileSystemCache.db = null;
    // Initialize to get mockDB reference
    await fileSystemCache.init();
    mockDB = fileSystemCache.db;
  });
  
  afterEach(() => {
    global.indexedDB = originalIndexedDB;
    fileSystemCache.db = null;
    mockIndexedDB._data.clear();
    mockDB = null;
  });
  
  describe('init', () => {
    it('should initialize database connection', async () => {
      await fileSystemCache.init();
      expect(mockIndexedDB.open).toHaveBeenCalledWith('MediaTrackerFileSystem', 1);
      expect(fileSystemCache.db).toBeTruthy();
    });
    
    it('should return existing connection if already initialized', async () => {
      await fileSystemCache.init();
      const firstDb = fileSystemCache.db;
      await fileSystemCache.init();
      expect(fileSystemCache.db).toBe(firstDb);
      expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    });
    
    it('should handle database errors', async () => {
      // Reset db to null first
      fileSystemCache.db = null;
      
      const error = new Error('Database error');
      // Save original open function
      const originalOpen = mockIndexedDB.open;
      
      // Replace open to trigger error
      mockIndexedDB.open = vi.fn((dbName, version) => {
        const request = {
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          error: error
        };
        // Trigger error only - don't call onsuccess
        setTimeout(() => {
          request.error = error;
          if (request.onerror) {
            request.onerror({ target: request });
          }
          // Do NOT call onsuccess
        }, 0);
        return request;
      });
      
      try {
        await expect(fileSystemCache.init()).rejects.toEqual(error);
      } finally {
        // Restore original
        mockIndexedDB.open = originalOpen;
        fileSystemCache.db = null;
        // Re-initialize for other tests
        await fileSystemCache.init();
      }
    });
  });
  
  describe('storeDirectoryHandle', () => {
    beforeEach(async () => {
      await fileSystemCache.init();
    });
    
    it('should store directory handle', async () => {
      const mockHandle = {
        name: 'Test Directory',
        kind: 'directory'
      };
      
      await fileSystemCache.storeDirectoryHandle(mockHandle);
      
      const stored = mockIndexedDB._data.get('current');
      expect(stored).toBeTruthy();
      expect(stored.handle).toEqual(mockHandle);
      expect(stored.name).toBe('Test Directory');
      expect(stored.timestamp).toBeTruthy();
    });
  });
  
  describe('getDirectoryHandle', () => {
    beforeEach(async () => {
      await fileSystemCache.init();
    });
    
    it('should return null when no handle stored', async () => {
      const handle = await fileSystemCache.getDirectoryHandle();
      expect(handle).toBeNull();
    });
    
    it('should return stored directory handle', async () => {
      const mockHandle = {
        name: 'Test Directory',
        kind: 'directory'
      };
      
      mockIndexedDB._data.set('current', {
        id: 'current',
        handle: mockHandle,
        name: 'Test Directory',
        timestamp: Date.now()
      });
      
      const handle = await fileSystemCache.getDirectoryHandle();
      expect(handle).toEqual(mockHandle);
    });
  });
  
  describe('clearDirectoryHandle', () => {
    beforeEach(async () => {
      await fileSystemCache.init();
      mockIndexedDB._data.set('current', {
        id: 'current',
        handle: { name: 'Test Directory' },
        name: 'Test Directory',
        timestamp: Date.now()
      });
    });
    
    it('should clear stored directory handle', async () => {
      await fileSystemCache.clearDirectoryHandle();
      expect(mockIndexedDB._data.has('current')).toBe(false);
    });
  });
  
  describe('verifyHandlePermission', () => {
    beforeEach(async () => {
      await fileSystemCache.init();
    });
    
    it('should return true when permission is granted', async () => {
      const mockHandle = {
        queryPermission: vi.fn(() => Promise.resolve('granted'))
      };
      
      const result = await fileSystemCache.verifyHandlePermission(mockHandle);
      expect(result).toBe(true);
      expect(mockHandle.queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });
    
    it('should return false when permission is denied', async () => {
      const mockHandle = {
        queryPermission: vi.fn(() => Promise.resolve('denied'))
      };
      
      const result = await fileSystemCache.verifyHandlePermission(mockHandle, false);
      expect(result).toBe(false);
    });
    
    it('should return false when permission is prompt and requestIfNeeded is false', async () => {
      const mockHandle = {
        queryPermission: vi.fn(() => Promise.resolve('prompt'))
      };
      
      const result = await fileSystemCache.verifyHandlePermission(mockHandle, false);
      expect(result).toBe(false);
    });
    
    it('should request permission when requestIfNeeded is true and permission is prompt', async () => {
      const mockHandle = {
        queryPermission: vi.fn(() => Promise.resolve('prompt')),
        requestPermission: vi.fn(() => Promise.resolve('granted'))
      };
      
      const result = await fileSystemCache.verifyHandlePermission(mockHandle, true);
      expect(result).toBe(true);
      expect(mockHandle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });
    
    it('should return false when permission request fails', async () => {
      const mockHandle = {
        queryPermission: vi.fn(() => Promise.resolve('prompt')),
        requestPermission: vi.fn(() => Promise.reject(new Error('Permission denied')))
      };
      
      const result = await fileSystemCache.verifyHandlePermission(mockHandle, true);
      expect(result).toBe(false);
    });
    
    it('should handle errors gracefully', async () => {
      const mockHandle = {
        queryPermission: vi.fn(() => Promise.reject(new Error('Query failed')))
      };
      
      const result = await fileSystemCache.verifyHandlePermission(mockHandle);
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle storeDirectoryHandle transaction errors', async () => {
      const mockHandle = {
        name: 'Test Directory',
        kind: 'directory'
      };
      
      // Create a new mock store with error
      const errorStore = {
        put: vi.fn(() => {
          const request = {
            onsuccess: null,
            onerror: null,
            error: null
          };
          setTimeout(() => {
            request.error = new Error('Put failed');
            if (request.onerror) {
              request.onerror({ target: request });
            }
          }, 0);
          return request;
        })
      };
      
      const errorTransaction = {
        objectStore: vi.fn(() => errorStore)
      };
      
      // Use the mockDB from beforeEach
      mockDB.transaction = vi.fn(() => errorTransaction);
      
      await expect(fileSystemCache.storeDirectoryHandle(mockHandle)).rejects.toThrow('Put failed');
    });

    it('should handle getDirectoryHandle transaction errors', async () => {
      // Create a new mock store with error
      const errorStore = {
        get: vi.fn(() => {
          const request = {
            result: null,
            onsuccess: null,
            onerror: null,
            error: null
          };
          setTimeout(() => {
            request.error = new Error('Get failed');
            if (request.onerror) {
              request.onerror({ target: request });
            }
          }, 0);
          return request;
        })
      };
      
      const errorTransaction = {
        objectStore: vi.fn(() => errorStore)
      };
      
      // Use the mockDB from beforeEach
      mockDB.transaction = vi.fn(() => errorTransaction);
      
      await expect(fileSystemCache.getDirectoryHandle()).rejects.toThrow('Get failed');
    });

    it('should handle clearDirectoryHandle transaction errors', async () => {
      // Create a new mock store with error
      const errorStore = {
        delete: vi.fn(() => {
          const request = {
            onsuccess: null,
            onerror: null,
            error: null
          };
          setTimeout(() => {
            request.error = new Error('Delete failed');
            if (request.onerror) {
              request.onerror({ target: request });
            }
          }, 0);
          return request;
        })
      };
      
      const errorTransaction = {
        objectStore: vi.fn(() => errorStore)
      };
      
      // Use the mockDB from beforeEach
      mockDB.transaction = vi.fn(() => errorTransaction);
      
      await expect(fileSystemCache.clearDirectoryHandle()).rejects.toThrow('Delete failed');
    });
  });
});
