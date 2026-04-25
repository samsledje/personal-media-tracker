import { StorageAdapter } from './storageAdapter.js';
import { parseMarkdown, generateMarkdown } from '../utils/markdownUtils.js';
import { fileSystemCache } from './fileSystemCache.js';

/**
 * File System Access API Storage Adapter
 * Implements storage operations using the File System Access API for local file storage
 */
export class FileSystemStorage extends StorageAdapter {
  constructor() {
    super();
    this.directoryHandle = null;
    this.trashHandle = null;
  }

  static isSupported() {
    // Check if File System Access API is supported
    return typeof window !== 'undefined' &&
      'showDirectoryPicker' in window &&
      'FileSystemDirectoryHandle' in window;
  }

  getStorageType() {
    return 'filesystem';
  }

  async initialize() {
    // File System Access API doesn't require initialization
    return true;
  }

  isConnected() {
    return !!this.directoryHandle;
  }

  getStorageInfo() {
    if (!this.directoryHandle) return null;
    return {
      account: null,
      folder: this.directoryHandle.name
    };
  }

  async selectStorage() {
    try {
      console.log('Opening directory picker...');
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      console.log('Directory selected:', handle.name);

      this.directoryHandle = handle;
      this.trashHandle = null; // Reset trash handle, will be created when needed

      // Store handle in IndexedDB for persistence
      try {
        await fileSystemCache.storeDirectoryHandle(handle);
        localStorage.setItem('fileSystemConnected', 'true');
        localStorage.setItem('fileSystemDirectoryName', handle.name);
        console.log('[FileSystem] Connection persisted');
      } catch (cacheError) {
        console.error('[FileSystem] Failed to persist connection:', cacheError);
        // Continue anyway - connection works even if persistence fails
      }

      return {
        handle: handle,
        name: handle.name
      };
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        throw new Error(`Error: ${error.message}. Make sure you're using Chrome, Edge, or Opera.`);
      }
      throw error;
    }
  }

  /**
   * Attempt to reconnect to previously selected directory without user interaction
   * This tries to restore the stored handle and verify permissions are still valid
   * @returns {Promise<void>}
   */
  async tryReconnect() {
    console.log('Attempting to restore File System connection...');

    try {
      // Try to get the stored handle from IndexedDB
      const storedHandle = await fileSystemCache.getDirectoryHandle();

      if (!storedHandle) {
        throw new Error('No stored directory handle found');
      }

      // Verify the handle is still valid and permissions are granted
      const hasPermission = await fileSystemCache.verifyHandlePermission(storedHandle, false);

      if (!hasPermission) {
        throw new Error('Stored directory permissions have been revoked');
      }

      // Set the handle and verify it works
      this.directoryHandle = storedHandle;
      this.trashHandle = null; // Will be created when needed

      console.log('Successfully reconnected to File System directory:', storedHandle.name);

    } catch (error) {
      console.log('File System reconnection failed:', error.message);

      // Clear invalid stored data
      await fileSystemCache.clearDirectoryHandle();
      localStorage.removeItem('fileSystemConnected');
      localStorage.removeItem('fileSystemDirectoryName');

      throw error;
    }
  }

  async disconnect() {
    this.directoryHandle = null;
    this.trashHandle = null;

    // Clear persisted connection
    try {
      await fileSystemCache.clearDirectoryHandle();
      localStorage.removeItem('fileSystemConnected');
      localStorage.removeItem('fileSystemDirectoryName');
      console.log('[FileSystem] Connection cleared');
    } catch (error) {
      console.error('[FileSystem] Failed to clear persisted connection:', error);
    }
  }

  async loadItems(onProgress = null) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    console.log('Loading items from directory...');
    const loadedItems = [];

    try {
      for await (const entry of this.directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          try {
            const file = await entry.getFile();
            const content = await file.text();
            const { metadata, body } = parseMarkdown(content);

            loadedItems.push({
              id: entry.name.replace('.md', ''),
              filename: entry.name,
              // preserve parsed status from frontmatter
              status: metadata.status,
              title: metadata.title || 'Untitled',
              type: metadata.type || 'book',
              author: metadata.author,
              director: metadata.director,
              actors: metadata.actors || [],
              isbn: metadata.isbn,
              year: metadata.year,
              rating: metadata.rating,
              tags: metadata.tags || [],
              coverUrl: metadata.coverUrl,
              dateRead: metadata.dateRead,
              dateWatched: metadata.dateWatched,
              dateAdded: metadata.dateAdded,
              review: body
            });
          } catch (err) {
            console.error(`Error loading ${entry.name}:`, err);
          }
        }
      }

      return loadedItems.sort((a, b) =>
        new Date(b.dateAdded) - new Date(a.dateAdded)
      );
    } catch (err) {
      console.error('Error reading directory:', err);
      throw new Error(`Error reading directory: ${err.message}`);
    }
  }

  async saveItem(item) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      // If filename is not provided, try to find an existing file that matches
      // this item's identifying metadata (title + type + director/author). This
      // ensures updates overwrite the original file instead of creating a new
      // one when the import flow finds a match but the item object lacks
      // filename.
      let filename = item.filename;
      if (!filename) {
        try {
          for await (const entry of this.directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
              try {
                const file = await entry.getFile();
                const content = await file.text();
                const { metadata } = parseMarkdown(content);
                const titleMatch = String(metadata.title || '').trim().toLowerCase() === String(item.title || '').trim().toLowerCase();
                const typeMatch = String(metadata.type || 'book') === String(item.type || 'book');
                const secondMeta = item.type === 'movie' ? (metadata.director || '') : (metadata.author || '');
                const secondMatch = String(secondMeta || '').trim().toLowerCase() === String(item.type === 'movie' ? (item.director || '') : (item.author || '')).trim().toLowerCase();
                if (titleMatch && typeMatch && secondMatch) {
                  filename = entry.name;
                  break;
                }
              } catch (e) {
                // ignore errors reading individual files
              }
            }
          }
        } catch (err) {
          // ignore directory scan errors and fall back to creating a new file
          filename = null;
        }
      }

      // If we still don't have a filename, generate one
      if (!filename) {
        filename = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.md`;
      }

      // Ensure the item object knows its filename so callers can update the same file later
      item.filename = filename;

      const fileExists = await this.fileExists(filename).catch(() => false);
      if (fileExists) {
        console.debug('[Storage][FS] updating existing file', filename);
      } else {
        console.debug('[Storage][FS] creating new file', filename);
      }
      const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(generateMarkdown(item));
      await writable.close();
    } catch (err) {
      console.error('Error saving file:', err);
      throw new Error('Error saving file. Please try again.');
    }
  }

  /**
   * Write an arbitrary file (e.g., Obsidian Base) to the root directory
   * @param {string} filename
   * @param {string} content
   */
  async writeFile(filename, content) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error('Error writing file:', err);
      throw new Error('Error writing file. Please try again.');
    }
  }

  async fileExists(filename) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      await this.directoryHandle.getFileHandle(filename, { create: false });
      return true;
    } catch (err) {
      // Not found -> return false
      return false;
    }
  }

  async deleteItem(item) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      const trashDir = await this._getOrCreateTrashDir();
      const srcHandle = await this.directoryHandle.getFileHandle(item.filename);
      const file = await srcHandle.getFile();

      let trashName = item.filename;
      // if file exists in trash, append timestamp
      try {
        await trashDir.getFileHandle(trashName);
        trashName = `${item.filename.replace(/\.md$/, '')}-${Date.now()}.md`;
      } catch (e) {
        // not found -> ok
      }

      const dest = await trashDir.getFileHandle(trashName, { create: true });
      const writable = await dest.createWritable();
      await writable.write(await file.text());
      await writable.close();

      // remove original
      await this.directoryHandle.removeEntry(item.filename);

      return { from: item.filename, to: `.trash/${trashName}` };
    } catch (err) {
      console.error('Error moving file to trash:', err);
      throw new Error('Error deleting file. Please try again.');
    }
  }

  async restoreItem(undoInfo) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      const trashDir = await this._getOrCreateTrashDir();
      const trashPath = undoInfo.to.replace(/^\.trash\//, '');
      const trashFile = await trashDir.getFileHandle(trashPath);
      const file = await trashFile.getFile();

      // restore to original name; if it exists, append timestamp
      let restoreName = undoInfo.from;
      try {
        await this.directoryHandle.getFileHandle(restoreName);
        restoreName = `${restoreName.replace(/\.md$/, '')}-restored-${Date.now()}.md`;
      } catch (e) {
        // not found -> ok
      }

      const dest = await this.directoryHandle.getFileHandle(restoreName, { create: true });
      const writable = await dest.createWritable();
      await writable.write(await file.text());
      await writable.close();

      // remove from trash
      await trashDir.removeEntry(trashPath);

      return restoreName;
    } catch (err) {
      console.error('Error undoing trash', err);
      const errorMsg = err.message || 'Unknown error';
      throw new Error(`Error restoring file: ${errorMsg}`);
    }
  }

  /**
   * Get or create a trash directory within the current directory handle
   * @returns {Promise<FileSystemDirectoryHandle>} Trash directory handle
   */
  async _getOrCreateTrashDir() {
    if (this.trashHandle) {
      return this.trashHandle;
    }

    try {
      this.trashHandle = await this.directoryHandle.getDirectoryHandle('.trash', { create: true });
      return this.trashHandle;
    } catch (err) {
      console.error('Error creating/reading .trash dir', err);
      throw err;
    }
  }

  /**
   * List all items in the trash
   * @returns {Promise<object[]>} Array of trashed items with metadata
   */
  async listTrash() {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      const trashDir = await this._getOrCreateTrashDir();
      const trashedItems = [];

      for await (const entry of trashDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          try {
            const file = await entry.getFile();
            const content = await file.text();
            const { metadata } = parseMarkdown(content);

            trashedItems.push({
              id: entry.name.replace('.md', ''),
              filename: entry.name,
              title: metadata.title || 'Untitled',
              type: metadata.type || 'book',
              author: metadata.author,
              director: metadata.director,
              year: metadata.year,
              deletedAt: file.lastModified,
              size: file.size
            });
          } catch (err) {
            console.error(`Error loading trash item ${entry.name}:`, err);
          }
        }
      }

      return trashedItems.sort((a, b) => b.deletedAt - a.deletedAt);
    } catch (err) {
      console.error('Error listing trash:', err);
      throw new Error(`Error listing trash: ${err.message}`);
    }
  }

  /**
   * Restore an item from trash by filename
   * @param {string} filename - Filename of the item to restore
   * @returns {Promise<string>} Restored item identifier
   */
  async restoreFromTrash(filename) {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      const trashDir = await this._getOrCreateTrashDir();
      const trashFile = await trashDir.getFileHandle(filename);
      const file = await trashFile.getFile();

      // Restore to original name; if it exists, append timestamp
      let restoreName = filename;
      try {
        await this.directoryHandle.getFileHandle(restoreName);
        restoreName = `${restoreName.replace(/\.md$/, '')}-restored-${Date.now()}.md`;
      } catch (e) {
        // not found -> ok
      }

      const dest = await this.directoryHandle.getFileHandle(restoreName, { create: true });
      const writable = await dest.createWritable();
      await writable.write(await file.text());
      await writable.close();

      // remove from trash
      await trashDir.removeEntry(filename);

      return restoreName;
    } catch (err) {
      console.error('Error restoring from trash:', err);
      throw new Error(`Error restoring file: ${err.message}`);
    }
  }

  /**
   * Permanently delete all items from trash
   * @returns {Promise<number>} Number of items deleted
   */
  async emptyTrash() {
    if (!this.directoryHandle) {
      throw new Error('Please select a directory first');
    }

    try {
      const trashDir = await this._getOrCreateTrashDir();
      let deleteCount = 0;

      // Collect all entries first
      const entries = [];
      for await (const entry of trashDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          entries.push(entry.name);
        }
      }

      // Delete all entries
      for (const entryName of entries) {
        try {
          await trashDir.removeEntry(entryName);
          deleteCount++;
        } catch (err) {
          console.error(`Error deleting ${entryName}:`, err);
        }
      }

      return deleteCount;
    } catch (err) {
      console.error('Error emptying trash:', err);
      throw new Error(`Error emptying trash: ${err.message}`);
    }
  }
}
