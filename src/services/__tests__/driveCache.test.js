import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { driveCache } from '../driveCache.js';

// Simplified IndexedDB mock for testing
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
      // Immediately store the value
      data.set(value.fileId || value.id || value, value);
      setTimeout(() => {
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
      // Immediately delete the value
      data.delete(key);
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    }),
    clear: vi.fn(() => {
      const request = {
        onsuccess: null,
        onerror: null
      };
      setTimeout(() => {
        data.clear();
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    }),
    count: vi.fn(() => {
      const request = {
        result: null,
        onsuccess: null,
        onerror: null
      };
      setTimeout(() => {
        request.result = data.size;
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    }),
    index: vi.fn(() => ({
      openCursor: vi.fn((range) => {
        const request = {
          result: null,
          onsuccess: null,
          onerror: null
        };
        
        const items = Array.from(data.values()).filter(item => 
          !range || item.folderId === range
        );
        
        let cursorIndex = 0;
        const cursor = {
          value: null,
          key: null,
          _transaction: null, // Will be set by transaction
          continue: () => {
            setTimeout(() => {
              if (cursorIndex < items.length) {
                const item = items[cursorIndex++];
                cursor.value = item;
                cursor.key = item.fileId;
                request.result = cursor;
                if (request.onsuccess) {
                  request.onsuccess({ target: request });
                }
              } else {
                request.result = null;
                if (request.onsuccess) {
                  request.onsuccess({ target: request });
                }
              }
            }, 0);
          },
          delete: () => {
            if (cursor.key) {
              data.delete(cursor.key);
              // Track delete operation for transaction
              if (cursor._transaction) {
                cursor._transaction._deleteCount++;
                setTimeout(() => {
                  cursor._transaction._completedDeletes++;
                  const totalOps = cursor._transaction._putCount + cursor._transaction._deleteCount + cursor._transaction._clearCount;
                  const completedOps = cursor._transaction._completedPuts + cursor._transaction._completedDeletes + cursor._transaction._completedClears;
                  if (totalOps > 0 && totalOps === completedOps && cursor._transaction.oncomplete) {
                    setTimeout(() => {
                      cursor._transaction.oncomplete({ target: cursor._transaction });
                    }, 10);
                  }
                }, 1);
              } else {
                // Try to get transaction from store if cursor doesn't have it
                // This is a fallback for cases where cursor._transaction wasn't set
                setTimeout(() => {
                  // If no transaction found, we can't track it
                  // This should not happen in normal operation
                }, 10);
              }
            }
          }
        };
        
        // Attach transaction to cursor if store has it
        if (mockStore._transaction) {
          cursor._transaction = mockStore._transaction;
        }
        
        setTimeout(() => {
          if (items.length > 0) {
            cursor.continue();
          } else {
            request.result = null;
            if (request.onsuccess) {
              request.onsuccess({ target: request });
            }
          }
        }, 0);
        
        return request;
      })
    }))
  };
  
  
  const mockDB = {
    transaction: vi.fn(() => {
      // Create a fresh transaction each time
      const transaction = {
        objectStore: vi.fn(() => mockStore),
        oncomplete: null,
        onerror: null,
        error: null,
        _putCount: 0,
        _completedPuts: 0
      };
      
      // Wrap put and delete to track operations for this transaction
      const originalPut = mockStore.put;
      const originalDelete = mockStore.delete;
      const originalClear = mockStore.clear;
      
      transaction._putCount = 0;
      transaction._completedPuts = 0;
      transaction._deleteCount = 0;
      transaction._completedDeletes = 0;
      transaction._clearCount = 0;
      transaction._completedClears = 0;
      
      const checkTransactionComplete = () => {
        const totalOps = transaction._putCount + transaction._deleteCount + transaction._clearCount;
        const completedOps = transaction._completedPuts + transaction._completedDeletes + transaction._completedClears;
        if (totalOps > 0 && totalOps === completedOps && transaction.oncomplete) {
          setTimeout(() => {
            transaction.oncomplete({ target: transaction });
          }, 10);
        }
      };
      
      const transactionPut = vi.fn((value) => {
        const request = originalPut(value);
        transaction._putCount++;
        
        // After the original put completes, check if all operations are done
        setTimeout(() => {
          transaction._completedPuts++;
          checkTransactionComplete();
        }, 1);
        
        return request;
      });
      
      const transactionDelete = vi.fn((key) => {
        const request = originalDelete(key);
        transaction._deleteCount++;
        
        // After the original delete completes, check if all operations are done
        setTimeout(() => {
          transaction._completedDeletes++;
          checkTransactionComplete();
        }, 1);
        
        return request;
      });
      
      const transactionClear = vi.fn(() => {
        const request = originalClear();
        transaction._clearCount++;
        
        // After the original clear completes, check if all operations are done
        setTimeout(() => {
          transaction._completedClears++;
          checkTransactionComplete();
        }, 1);
        
        return request;
      });
      
      // Override mockStore methods for this transaction
      const originalObjectStore = transaction.objectStore;
      transaction.objectStore = vi.fn(() => {
        const store = originalObjectStore();
        store.put = transactionPut;
        store.delete = transactionDelete;
        store.clear = transactionClear;
        
        // Attach transaction to store so cursor can access it
        store._transaction = transaction;
        
        // Wrap index.openCursor to attach transaction to cursor
        const originalIndex = store.index;
        store.index = vi.fn((name) => {
          const index = originalIndex(name);
          const originalOpenCursor = index.openCursor;
          index.openCursor = vi.fn((range) => {
            const request = originalOpenCursor(range);
            // Wrap onsuccess to attach transaction to cursor
            const originalOnSuccess = request.onsuccess;
            request.onsuccess = (event) => {
              if (originalOnSuccess) {
                originalOnSuccess(event);
              }
              // Attach transaction to cursor when it's created
              if (request.result && typeof request.result === 'object' && request.result._transaction === null) {
                request.result._transaction = transaction;
              }
            };
            return request;
          });
          return index;
        });
        
        return store;
      });
      
      return transaction;
    }),
    createObjectStore: vi.fn(() => mockStore),
    objectStoreNames: {
      contains: vi.fn(() => true)
    }
  };
  
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
    _getStore: () => mockStore
  };
  
  return mockIndexedDB;
}

// Mock IDBKeyRange
global.IDBKeyRange = {
  only: (value) => value
};

describe('driveCache', () => {
  let mockIndexedDB;
  let originalIndexedDB;
  
  beforeEach(() => {
    originalIndexedDB = global.indexedDB;
    mockIndexedDB = createMockIndexedDB();
    global.indexedDB = mockIndexedDB;
    driveCache.db = null;
  });
  
  afterEach(() => {
    global.indexedDB = originalIndexedDB;
    driveCache.db = null;
    mockIndexedDB._data.clear();
  });
  
  describe('init', () => {
    it('should initialize database connection', async () => {
      await driveCache.init();
      expect(mockIndexedDB.open).toHaveBeenCalledWith('MediaTrackerCache', 1);
      expect(driveCache.db).toBeTruthy();
    });
    
    it('should return existing connection if already initialized', async () => {
      await driveCache.init();
      const firstDb = driveCache.db;
      await driveCache.init();
      expect(driveCache.db).toBe(firstDb);
      expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    });
    
    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockIndexedDB.open = vi.fn((dbName, version) => {
        const request = {
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          error: error
        };
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request });
          }
        }, 0);
        return request;
      });
      
      await expect(driveCache.init()).rejects.toEqual(error);
    });
  });
  
  describe('getCachedItems', () => {
    beforeEach(async () => {
      await driveCache.init();
    });
    
    it('should return empty map for empty cache', async () => {
      const items = await driveCache.getCachedItems('folder1');
      expect(items).toEqual({});
    });
    
    it('should return cached items for folder', async () => {
      const item1 = {
        fileId: 'file1',
        folderId: 'folder1',
        modifiedTime: '2024-01-01',
        filename: 'item1.md',
        data: { title: 'Test Item' }
      };
      const item2 = {
        fileId: 'file2',
        folderId: 'folder1',
        modifiedTime: '2024-01-02',
        filename: 'item2.md',
        data: { title: 'Test Item 2' }
      };
      
      mockIndexedDB._data.set('file1', item1);
      mockIndexedDB._data.set('file2', item2);
      
      const items = await driveCache.getCachedItems('folder1');
      expect(Object.keys(items)).toHaveLength(2);
      expect(items.file1).toEqual(item1);
      expect(items.file2).toEqual(item2);
    });
  });
  
  describe('cacheItems', () => {
    beforeEach(async () => {
      await driveCache.init();
    });
    
    it('should cache multiple items', async () => {
      const items = [
        {
          fileId: 'file1',
          modifiedTime: '2024-01-01',
          filename: 'item1.md',
          data: { title: 'Test Item' }
        },
        {
          fileId: 'file2',
          modifiedTime: '2024-01-02',
          filename: 'item2.md',
          data: { title: 'Test Item 2' }
        }
      ];
      
      await driveCache.cacheItems('folder1', items);
      
      expect(mockIndexedDB._data.has('file1')).toBe(true);
      expect(mockIndexedDB._data.has('file2')).toBe(true);
    });
  });
  
  describe('updateCachedItem', () => {
    beforeEach(async () => {
      await driveCache.init();
    });
    
    it('should update a single cached item', async () => {
      await driveCache.updateCachedItem('folder1', 'file1', '2024-01-01', 'item1.md', { title: 'Updated' });
      
      const item = mockIndexedDB._data.get('file1');
      expect(item).toBeTruthy();
      expect(item.data.title).toBe('Updated');
    });
  });
  
  describe('removeCachedItem', () => {
    beforeEach(async () => {
      await driveCache.init();
      mockIndexedDB._data.set('file1', { fileId: 'file1', folderId: 'folder1' });
    });
    
    it('should remove a single item from cache', async () => {
      await driveCache.removeCachedItem('file1');
      expect(mockIndexedDB._data.has('file1')).toBe(false);
    });
  });
  
  describe('removeCachedItems', () => {
    beforeEach(async () => {
      await driveCache.init();
      mockIndexedDB._data.set('file1', { fileId: 'file1' });
      mockIndexedDB._data.set('file2', { fileId: 'file2' });
    });
    
    it('should remove multiple items from cache', async () => {
      await driveCache.removeCachedItems(['file1', 'file2']);
      expect(mockIndexedDB._data.has('file1')).toBe(false);
      expect(mockIndexedDB._data.has('file2')).toBe(false);
    });
  });
  
  describe('clearFolderCache', () => {
    beforeEach(async () => {
      await driveCache.init();
      mockIndexedDB._data.set('file1', { fileId: 'file1', folderId: 'folder1' });
      mockIndexedDB._data.set('file2', { fileId: 'file2', folderId: 'folder2' });
    });
    
    it('should clear only items from specified folder', async () => {
      await driveCache.clearFolderCache('folder1');
      expect(mockIndexedDB._data.has('file1')).toBe(false);
      expect(mockIndexedDB._data.has('file2')).toBe(true);
    });
  });
  
  describe('clearAllCache', () => {
    beforeEach(async () => {
      await driveCache.init();
      mockIndexedDB._data.set('file1', { fileId: 'file1' });
      mockIndexedDB._data.set('file2', { fileId: 'file2' });
    });
    
    it('should clear all cached items', async () => {
      await driveCache.clearAllCache();
      expect(mockIndexedDB._data.size).toBe(0);
    });
  });
  
  describe('getCacheStats', () => {
    beforeEach(async () => {
      await driveCache.init();
      mockIndexedDB._data.set('file1', { fileId: 'file1' });
      mockIndexedDB._data.set('file2', { fileId: 'file2' });
    });
    
    it('should return cache statistics', async () => {
      const stats = await driveCache.getCacheStats();
      expect(stats).toHaveProperty('itemCount');
      expect(stats.itemCount).toBe(2);
    });
  });
});
