import { vi } from 'vitest';

/**
 * Mock IndexedDB for testing
 * Provides a complete mock implementation of IndexedDB API
 */
export function createMockIndexedDB() {
  const stores = new Map();
  const databases = new Map();
  
  class MockIDBRequest {
    constructor() {
      this.result = null;
      this.error = null;
      this.readyState = 'pending';
      this.onsuccess = null;
      this.onerror = null;
    }
    
    triggerSuccess(result) {
      this.result = result;
      this.readyState = 'done';
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }
    
    triggerError(error) {
      this.error = error;
      this.readyState = 'done';
      if (this.onerror) {
        this.onerror({ target: this });
      }
    }
  }
  
  class MockIDBTransaction {
    constructor(storeNames, mode = 'readonly') {
      this.objectStoreNames = { contains: (name) => storeNames.includes(name) };
      this.mode = mode;
      this.error = null;
      this.oncomplete = null;
      this.onerror = null;
      this._stores = new Map();
      
      storeNames.forEach(name => {
        this._stores.set(name, new MockIDBObjectStore(name, mode));
      });
    }
    
    objectStore(name) {
      return this._stores.get(name);
    }
    
    triggerComplete() {
      if (this.oncomplete) {
        this.oncomplete({ target: this });
      }
    }
    
    triggerError(error) {
      this.error = error;
      if (this.onerror) {
        this.onerror({ target: this });
      }
    }
  }
  
  class MockIDBObjectStore {
    constructor(name, mode = 'readonly') {
      this.name = name;
      this.indexNames = { contains: () => false };
      this._data = new Map();
      this._indexes = new Map();
    }
    
    createIndex(name, keyPath, options = {}) {
      const index = new MockIDBIndex(name, keyPath, options);
      this._indexes.set(name, index);
      return index;
    }
    
    index(name) {
      return this._indexes.get(name);
    }
    
    get(key) {
      const request = new MockIDBRequest();
      setTimeout(() => {
        const value = this._data.get(key);
        request.triggerSuccess(value !== undefined ? value : undefined);
      }, 0);
      return request;
    }
    
    put(value) {
      const request = new MockIDBRequest();
      setTimeout(() => {
        this._data.set(value.fileId || value.id || value, value);
        request.triggerSuccess(value);
      }, 0);
      return request;
    }
    
    delete(key) {
      const request = new MockIDBRequest();
      setTimeout(() => {
        this._data.delete(key);
        request.triggerSuccess();
      }, 0);
      return request;
    }
    
    clear() {
      const request = new MockIDBRequest();
      setTimeout(() => {
        this._data.clear();
        request.triggerSuccess();
      }, 0);
      return request;
    }
    
    count() {
      const request = new MockIDBRequest();
      setTimeout(() => {
        request.triggerSuccess(this._data.size);
      }, 0);
      return request;
    }
    
    openCursor(range = null) {
      const request = new MockIDBRequest();
      const values = Array.from(this._data.values());
      let index = 0;
      
      const cursor = {
        value: null,
        key: null,
        continue: () => {
          if (index < values.length) {
            const value = values[index++];
            if (range) {
              // Simple range matching for IDBKeyRange.only()
              if (range === value.folderId || range === value.id) {
                cursor.value = value;
                cursor.key = value.fileId || value.id || index;
                request.triggerSuccess({ result: cursor });
              } else if (index < values.length) {
                cursor.continue();
              } else {
                request.triggerSuccess({ result: null });
              }
            } else {
              cursor.value = value;
              cursor.key = value.fileId || value.id || index;
              request.triggerSuccess({ result: cursor });
            }
          } else {
            request.triggerSuccess({ result: null });
          }
        },
        delete: () => {
          const key = cursor.key;
          if (key) {
            this._data.delete(key);
          }
        }
      };
      
      setTimeout(() => {
        if (values.length > 0) {
          cursor.continue();
        } else {
          request.triggerSuccess({ result: null });
        }
      }, 0);
      
      return request;
    }
  }
  
  class MockIDBIndex {
    constructor(name, keyPath, options = {}) {
      this.name = name;
      this.keyPath = keyPath;
      this._data = new Map();
    }
    
    openCursor(range = null) {
      const request = new MockIDBRequest();
      const values = Array.from(this._data.values());
      let index = 0;
      
      const cursor = {
        value: null,
        key: null,
        continue: () => {
          if (index < values.length) {
            const value = values[index++];
            if (range && range === value[this.keyPath]) {
              cursor.value = value;
              cursor.key = value.fileId || value.id || index;
              request.triggerSuccess({ result: cursor });
            } else if (index < values.length) {
              cursor.continue();
            } else {
              request.triggerSuccess({ result: null });
            }
          } else {
            request.triggerSuccess({ result: null });
          }
        },
        delete: () => {
          const key = cursor.key;
          if (key) {
            this._data.delete(key);
          }
        }
      };
      
      setTimeout(() => {
        if (values.length > 0) {
          cursor.continue();
        } else {
          request.triggerSuccess({ result: null });
        }
      }, 0);
      
      return request;
    }
  }
  
  class MockIDBDatabase {
    constructor(name, version) {
      this.name = name;
      this.version = version;
      this.objectStoreNames = { contains: (name) => stores.has(`${name}:${name}`) };
      this._stores = new Map();
    }
    
    createObjectStore(name, options = {}) {
      const store = new MockIDBObjectStore(name);
      stores.set(`${this.name}:${name}`, store);
      this._stores.set(name, store);
      return store;
    }
    
    transaction(storeNames, mode = 'readonly') {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      return new MockIDBTransaction(names, mode);
    }
  }
  
  class MockIDBOpenDBRequest extends MockIDBRequest {
    constructor(dbName, version) {
      super();
      this.dbName = dbName;
      this.version = version;
      this.onupgradeneeded = null;
    }
  }
  
  const mockIndexedDB = {
    open: vi.fn((dbName, version) => {
      const request = new MockIDBOpenDBRequest(dbName, version);
      
      setTimeout(() => {
        if (!databases.has(dbName)) {
          const db = new MockIDBDatabase(dbName, version);
          databases.set(dbName, db);
          
          // Trigger onupgradeneeded
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: { result: db } });
          }
        }
        
        const db = databases.get(dbName);
        request.result = db;
        request.triggerSuccess(db);
      }, 0);
      
      return request;
    }),
    
    deleteDatabase: vi.fn((dbName) => {
      const request = new MockIDBRequest();
      setTimeout(() => {
        databases.delete(dbName);
        request.triggerSuccess();
      }, 0);
      return request;
    })
  };
  
  // Helper to access store data for assertions
  mockIndexedDB._getStoreData = (dbName, storeName) => {
    const store = stores.get(`${dbName}:${storeName}`);
    return store ? Array.from(store._data.values()) : [];
  };
  
  // Helper to clear all data
  mockIndexedDB._clear = () => {
    stores.clear();
    databases.clear();
  };
  
  return mockIndexedDB;
}

/**
 * Create IDBKeyRange mock
 */
export const IDBKeyRange = {
  only: (value) => value,
  bound: (lower, upper) => ({ lower, upper }),
  lowerBound: (lower) => ({ lower }),
  upperBound: (upper) => ({ upper })
};
