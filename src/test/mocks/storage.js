import { vi } from 'vitest';

/**
 * Mock FileSystemStorage adapter for testing
 */
export class MockFileSystemStorage {
  constructor() {
    this.connected = false;
    this.items = [];
    this.directoryHandle = null;
    this.files = {}; // Store arbitrary files
  }

  async initialize() {
    this.connected = true;
    return true;
  }

  isConnected() {
    return this.connected;
  }

  getStorageInfo() {
    return { account: null, folder: this.directoryHandle?.name || 'Mock Directory' };
  }

  getStorageType() {
    return 'filesystem';
  }

  async selectStorage() {
    this.directoryHandle = { name: 'TestDirectory' };
    this.connected = true;
    return true;
  }

  async disconnect() {
    this.connected = false;
    this.directoryHandle = null;
    this.items = [];
    this.files = {};
  }

  async loadItems(progressCallback) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    
    if (progressCallback) {
      for (let i = 0; i < this.items.length; i++) {
        progressCallback({
          processed: i + 1,
          total: this.items.length,
          items: this.items.slice(0, i + 1)
        });
      }
    }
    
    return [...this.items];
  }

  async saveItem(item) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    
    const existingIndex = this.items.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
    
    return item;
  }

  async deleteItem(item) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    
    const index = this.items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
    
    return { item, index };
  }

  async restoreItem(undoInfo) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    
    this.items.splice(undoInfo.index, 0, undoInfo.item);
    return undoInfo.item;
  }

  async readFile(filename) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    return this.files[filename] || null;
  }

  async writeFile(filename, content) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    this.files[filename] = content;
    return true;
  }

  async fileExists(filename) {
    if (!this.connected) {
      throw new Error('Storage not connected');
    }
    return filename in this.files;
  }

  // Test helper methods
  _setItems(items) {
    this.items = [...items];
  }

  _getItems() {
    return [...this.items];
  }

  _setFile(filename, content) {
    this.files[filename] = content;
  }

  _getFile(filename) {
    return this.files[filename];
  }

  _clearFiles() {
    this.files = {};
  }
}

/**
 * Mock GoogleDriveStorage adapter for testing
 */
export class MockGoogleDriveStorage extends MockFileSystemStorage {
  constructor() {
    super();
    this.folderId = null;
    this.folderName = 'MarkdownMediaTracker';
    this.accessToken = null;
  }

  async initialize() {
    this.connected = true;
    this.accessToken = 'mock-token';
    return true;
  }

  getStorageInfo() {
    return { account: 'mock@example.com', folder: this.folderName };
  }

  getStorageType() {
    return 'googledrive';
  }

  async selectStorage() {
    this.folderId = 'mock-folder-id';
    this.connected = true;
    this.accessToken = 'mock-token';
    return true;
  }

  async disconnect() {
    await super.disconnect();
    this.folderId = null;
    this.accessToken = null;
  }

  async clearCache() {
    // Mock cache clearing
    return true;
  }
}

/**
 * Create a mock storage adapter factory
 */
export function createMockStorage(type = 'filesystem', initialItems = []) {
  const storage = type === 'googledrive' 
    ? new MockGoogleDriveStorage() 
    : new MockFileSystemStorage();
  
  storage._setItems(initialItems);
  
  return storage;
}
