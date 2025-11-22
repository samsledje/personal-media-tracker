/**
 * Storage Adapter Interface
 * Abstract layer that provides uniform interface for both File System Access API and Google Drive API
 */

export class StorageAdapter {
  constructor() {
    if (this.constructor === StorageAdapter) {
      throw new Error('StorageAdapter is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Initialize the storage connection
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Check if the storage is currently connected/available
   * @returns {boolean} Connection status
   */
  isConnected() {
    throw new Error('isConnected() must be implemented by subclass');
  }

  /**
   * Get the current storage location info (directory name, path, etc.)
   * @returns {string|null} Storage location identifier
   */
  getStorageInfo() {
    throw new Error('getStorageInfo() must be implemented by subclass');
  }

  /**
   * Select/connect to a storage location
   * @returns {Promise<any>} Storage handle/connection info
   */
  async selectStorage() {
    throw new Error('selectStorage() must be implemented by subclass');
  }

  /**
   * Disconnect from current storage
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Load all items from the storage location
   * @returns {Promise<object[]>} Array of loaded items
   */
  async loadItems() {
    throw new Error('loadItems() must be implemented by subclass');
  }

  /**
   * Save an item to storage
   * @param {object} item - Item to save
   * @returns {Promise<void>}
   */
  async saveItem(item) {
    throw new Error('saveItem() must be implemented by subclass');
  }

  /**
   * Delete an item (move to trash)
   * @param {object} item - Item to delete
   * @returns {Promise<object>} Undo information
   */
  async deleteItem(item) {
    throw new Error('deleteItem() must be implemented by subclass');
  }

  /**
   * Restore an item from trash
   * @param {object} undoInfo - Undo information from deleteItem
   * @returns {Promise<string>} Restored item identifier
   */
  async restoreItem(undoInfo) {
    throw new Error('restoreItem() must be implemented by subclass');
  }

  /**
   * List all items in the trash
   * @returns {Promise<object[]>} Array of trashed items with metadata
   */
  async listTrash() {
    throw new Error('listTrash() must be implemented by subclass');
  }

  /**
   * Restore an item from trash by filename
   * @param {string} filename - Filename of the item to restore
   * @returns {Promise<string>} Restored item identifier
   */
  async restoreFromTrash(filename) {
    throw new Error('restoreFromTrash() must be implemented by subclass');
  }

  /**
   * Permanently delete all items from trash
   * @returns {Promise<number>} Number of items deleted
   */
  async emptyTrash() {
    throw new Error('emptyTrash() must be implemented by subclass');
  }

  /**
   * Write an arbitrary file to storage (used for misc files like Obsidian Base)
   * @param {string} filename
   * @param {string} content
   * @returns {Promise<void>}
   */
  async writeFile(filename, content) {
    throw new Error('writeFile() must be implemented by subclass');
  }

  /**
   * Check whether a given file exists in storage
   * @param {string} filename
   * @returns {Promise<boolean>}
   */
  async fileExists(filename) {
    throw new Error('fileExists() must be implemented by subclass');
  }

  /**
   * Get the storage type identifier
   * @returns {string} Storage type ('filesystem' | 'googledrive')
   */
  getStorageType() {
    throw new Error('getStorageType() must be implemented by subclass');
  }

  /**
   * Check if the current platform supports this storage type
   * @returns {boolean} Platform support status
   */
  static isSupported() {
    throw new Error('isSupported() must be implemented by subclass');
  }
}

/**
 * Storage Factory - detects platform capability and creates appropriate storage adapter
 */
export class StorageFactory {
  static async createAdapter(preferredType = null) {
    // Import adapters dynamically to avoid loading unnecessary code
    const [FileSystemStorage, GoogleDriveStorage] = await Promise.all([
      import('./fileSystemStorage.js').then(m => m.FileSystemStorage),
      import('./googleDriveStorageGIS.js').then(m => m.GoogleDriveStorageGIS)
    ]);

    // If a specific type is requested and supported, use it
    if (preferredType === 'filesystem' && FileSystemStorage.isSupported()) {
      return new FileSystemStorage();
    }
    if (preferredType === 'googledrive' && GoogleDriveStorage.isSupported()) {
      return new GoogleDriveStorage();
    }

    // Auto-detect best storage option based on platform
    if (FileSystemStorage.isSupported()) {
      // Prefer File System Access API on desktop browsers that support it
      return new FileSystemStorage();
    } else if (GoogleDriveStorage.isSupported()) {
      // Fall back to Google Drive on mobile/unsupported browsers
      return new GoogleDriveStorage();
    } else {
      throw new Error('No supported storage adapter available on this platform');
    }
  }

  static getAvailableAdapters() {
    return Promise.all([
      import('./fileSystemStorage.js').then(m => ({
        type: 'filesystem',
        name: 'Local Files',
        description: 'Store files locally on your device',
        supported: m.FileSystemStorage.isSupported(),
        icon: 'FolderOpen'
      })),
      import('./googleDriveStorageGIS.js').then(m => ({
        type: 'googledrive', 
        name: 'Google Drive',
        description: 'Store files in your Google Drive',
        supported: m.GoogleDriveStorageGIS.isSupported(),
        icon: 'Cloud'
      }))
    ]);
  }
}