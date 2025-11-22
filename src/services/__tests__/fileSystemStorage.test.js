import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileSystemStorage } from '../fileSystemStorage.js';

// Mock fileSystemCache
vi.mock('../fileSystemCache.js', () => ({
  fileSystemCache: {
    storeDirectoryHandle: vi.fn(() => Promise.resolve()),
    getDirectoryHandle: vi.fn(() => Promise.resolve(null)),
    clearDirectoryHandle: vi.fn(() => Promise.resolve()),
    verifyHandlePermission: vi.fn(() => Promise.resolve(true))
  }
}));

// Mock markdownUtils
vi.mock('../../utils/markdownUtils.js', () => ({
  parseMarkdown: vi.fn((content) => ({
    metadata: {
      title: 'Test Item',
      type: 'book',
      author: 'Test Author',
      status: 'read',
      rating: 5,
      tags: ['test'],
      dateAdded: '2024-01-01'
    },
    body: 'Test review'
  })),
  generateMarkdown: vi.fn((item) => `---
title: ${item.title}
type: ${item.type}
---
${item.review || ''}`)
}));

import { parseMarkdown, generateMarkdown } from '../../utils/markdownUtils.js';

describe('FileSystemStorage', () => {
  let storage;
  let mockDirectoryHandle;
  let mockFileHandle;
  let mockWritable;
  let mockTrashHandle;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new FileSystemStorage();

    mockWritable = {
      write: vi.fn(),
      close: vi.fn()
    };

    mockFileHandle = {
      getFile: vi.fn(() => Promise.resolve({
        text: () => Promise.resolve('---\ntitle: Test\n---\nContent')
      })),
      createWritable: vi.fn(() => Promise.resolve(mockWritable))
    };

    mockTrashHandle = {
      getFileHandle: vi.fn(() => Promise.resolve(mockFileHandle)),
      removeEntry: vi.fn()
    };

    mockDirectoryHandle = {
      name: 'TestDirectory',
      getDirectoryHandle: vi.fn(() => Promise.resolve(mockTrashHandle)),
      getFileHandle: vi.fn(() => Promise.resolve(mockFileHandle)),
      removeEntry: vi.fn(),
      values: vi.fn()
    };
  });

  describe('static methods', () => {
    it('should check if File System Access API is supported', () => {
      global.showDirectoryPicker = vi.fn();
      global.FileSystemDirectoryHandle = class {};

      const result = FileSystemStorage.isSupported();

      expect(result).toBe(true);
    });

    it('should return false if API is not supported', () => {
      const oldPicker = global.showDirectoryPicker;
      const oldHandle = global.FileSystemDirectoryHandle;

      delete global.showDirectoryPicker;
      delete global.FileSystemDirectoryHandle;

      const result = FileSystemStorage.isSupported();

      expect(result).toBe(false);

      global.showDirectoryPicker = oldPicker;
      global.FileSystemDirectoryHandle = oldHandle;
    });
  });

  describe('getStorageType', () => {
    it('should return "filesystem"', () => {
      expect(storage.getStorageType()).toBe('filesystem');
    });
  });

  describe('initialize', () => {
    it('should return true (no initialization needed)', async () => {
      const result = await storage.initialize();
      expect(result).toBe(true);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(storage.isConnected()).toBe(false);
    });

    it('should return true when directory handle is set', () => {
      storage.directoryHandle = mockDirectoryHandle;
      expect(storage.isConnected()).toBe(true);
    });
  });

  describe('getStorageInfo', () => {
    it('should return null when not connected', () => {
      expect(storage.getStorageInfo()).toBeNull();
    });

    it('should return directory name when connected', () => {
      storage.directoryHandle = mockDirectoryHandle;
      expect(storage.getStorageInfo()).toEqual({ account: null, folder: 'TestDirectory' });
    });
  });

  describe('selectStorage', () => {
    it('should open directory picker and store handle', async () => {
      global.showDirectoryPicker = vi.fn(() => Promise.resolve(mockDirectoryHandle));

      const result = await storage.selectStorage();

      expect(global.showDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' });
      expect(storage.directoryHandle).toBe(mockDirectoryHandle);
      expect(result).toEqual({
        handle: mockDirectoryHandle,
        name: 'TestDirectory'
      });
    });

    it('should reset trash handle when selecting storage', async () => {
      storage.trashHandle = mockTrashHandle;
      global.showDirectoryPicker = vi.fn(() => Promise.resolve(mockDirectoryHandle));

      await storage.selectStorage();

      expect(storage.trashHandle).toBeNull();
    });

    it('should throw error if user cancels (AbortError)', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      global.showDirectoryPicker = vi.fn(() => Promise.reject(abortError));

      await expect(storage.selectStorage()).rejects.toThrow('User cancelled');
    });

    it('should throw descriptive error for other failures', async () => {
      const error = new Error('Permission denied');
      global.showDirectoryPicker = vi.fn(() => Promise.reject(error));

      await expect(storage.selectStorage()).rejects.toThrow('Make sure you\'re using Chrome, Edge, or Opera');
    });
  });

  describe('disconnect', () => {
    it('should clear directory and trash handles', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      storage.trashHandle = mockTrashHandle;

      await storage.disconnect();

      expect(storage.directoryHandle).toBeNull();
      expect(storage.trashHandle).toBeNull();
    });
  });

  // ...existing code...

  describe('loadItems', () => {
    it('should throw error if not connected', async () => {
      await expect(storage.loadItems()).rejects.toThrow('Please select a directory first');
    });

    it('should load markdown files from directory', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      const mockEntry1 = {
        kind: 'file',
        name: 'test-item.md',
        getFile: () => Promise.resolve({
          text: () => Promise.resolve('---\ntitle: Test\n---\nContent')
        })
      };

      mockDirectoryHandle.values = vi.fn(async function* () {
        yield mockEntry1;
      });

      const items = await storage.loadItems();

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Test Item');
      expect(items[0].id).toBe('test-item');
      expect(parseMarkdown).toHaveBeenCalled();
    });

    it('should skip non-markdown files', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      const mockEntry1 = {
        kind: 'file',
        name: 'test.txt',
        getFile: () => Promise.resolve({
          text: () => Promise.resolve('Not markdown')
        })
      };

      mockDirectoryHandle.values = vi.fn(async function* () {
        yield mockEntry1;
      });

      const items = await storage.loadItems();

      expect(items).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      mockDirectoryHandle.values = vi.fn(() => {
        throw new Error('Permission denied');
      });

      await expect(storage.loadItems()).rejects.toThrow('Error reading directory');
    });
  });

  describe('saveItem', () => {
    it('should throw error if not connected', async () => {
      const item = { title: 'Test', type: 'book' };
      await expect(storage.saveItem(item)).rejects.toThrow('Please select a directory first');
    });

    it('should save item with existing filename', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      const item = {
        title: 'Test Item',
        type: 'book',
        filename: 'test-item.md'
      };

      await storage.saveItem(item);

      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('test-item.md', { create: true });
      expect(mockWritable.write).toHaveBeenCalled();
      expect(mockWritable.close).toHaveBeenCalled();
      expect(generateMarkdown).toHaveBeenCalledWith(item);
    });

    it('should generate filename if not provided', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      const item = {
        title: 'New Test Item',
        type: 'book'
      };

      await storage.saveItem(item);

      expect(item.filename).toMatch(/^new-test-item-\d+\.md$/);
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalled();
    });

    it('should find and update existing file by matching metadata', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      parseMarkdown.mockReturnValueOnce({
        metadata: {
          title: 'Test Item',
          type: 'book',
          author: 'Test Author'
        },
        body: 'Content'
      });

      const mockEntry = {
        kind: 'file',
        name: 'existing-item.md',
        getFile: () => Promise.resolve({
          text: () => Promise.resolve('content')
        })
      };

      mockDirectoryHandle.values = vi.fn(async function* () {
        yield mockEntry;
      });

      const item = {
        title: 'Test Item',
        type: 'book',
        author: 'Test Author'
      };

      await storage.saveItem(item);

      expect(item.filename).toBe('existing-item.md');
    });

    it('should handle file save errors', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const item = { title: 'Test', type: 'book', filename: 'test.md' };
      
      // Mock fileExists to return false so it tries to create
      storage.fileExists = vi.fn().mockResolvedValueOnce(false);
      
      // Make getFileHandle fail
      mockDirectoryHandle.getFileHandle.mockRejectedValueOnce(new Error('Write failed'));

      await expect(storage.saveItem(item)).rejects.toThrow('Error saving file');
    });
  });

  describe('writeFile', () => {
    it('should throw error if not connected', async () => {
      await expect(storage.writeFile('test.md', 'content')).rejects.toThrow('Please select a directory first');
    });

    it('should write arbitrary file to directory', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      await storage.writeFile('test.base', 'base content');

      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('test.base', { create: true });
      expect(mockWritable.write).toHaveBeenCalledWith('base content');
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('should handle write errors', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      mockDirectoryHandle.getFileHandle.mockRejectedValueOnce(new Error('Write failed'));

      await expect(storage.writeFile('test.md', 'content')).rejects.toThrow('Error writing file');
    });
  });

  describe('fileExists', () => {
    it('should throw error if not connected', async () => {
      await expect(storage.fileExists('test.md')).rejects.toThrow('Please select a directory first');
    });

    it('should return true if file exists', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      mockDirectoryHandle.getFileHandle.mockResolvedValueOnce(mockFileHandle);

      const result = await storage.fileExists('test.md');

      expect(result).toBe(true);
      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('test.md', { create: false });
    });

    it('should return false if file does not exist', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      mockDirectoryHandle.getFileHandle.mockRejectedValueOnce(new Error('Not found'));

      const result = await storage.fileExists('test.md');

      expect(result).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('should throw error if not connected', async () => {
      const item = { filename: 'test.md' };
      await expect(storage.deleteItem(item)).rejects.toThrow('Please select a directory first');
    });

    it('should move item to trash', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      const item = {
        title: 'Test',
        filename: 'test.md'
      };

      // Mock that file doesn't exist in trash
      mockTrashHandle.getFileHandle.mockRejectedValueOnce(new Error('Not found'));

      const result = await storage.deleteItem(item);

      expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('.trash', { create: true });
      expect(mockDirectoryHandle.removeEntry).toHaveBeenCalledWith('test.md');
      expect(result).toEqual({
        from: 'test.md',
        to: '.trash/test.md'
      });
    });

    it('should append timestamp if file exists in trash', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      // First call succeeds (file exists), second call for timestamped name
      mockTrashHandle.getFileHandle
        .mockResolvedValueOnce(mockFileHandle)
        .mockResolvedValueOnce(mockFileHandle);

      const item = { filename: 'test.md' };
      const result = await storage.deleteItem(item);

      expect(result.to).toMatch(/^\.trash\/test-\d+\.md$/);
    });

    it('should handle delete errors', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      mockDirectoryHandle.getFileHandle.mockRejectedValueOnce(new Error('Not found'));

      const item = { filename: 'test.md' };

      await expect(storage.deleteItem(item)).rejects.toThrow('Error deleting file');
    });
  });

  describe('restoreItem', () => {
    it('should throw error if not connected', async () => {
      const undoInfo = { from: 'test.md', to: '.trash/test.md' };
      await expect(storage.restoreItem(undoInfo)).rejects.toThrow('Please select a directory first');
    });

    it('should restore item from trash', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      // Mock file doesn't exist at original location
      mockDirectoryHandle.getFileHandle
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(mockFileHandle);

      const undoInfo = {
        from: 'original.md',
        to: '.trash/original.md'
      };

      const result = await storage.restoreItem(undoInfo);

      expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('.trash', { create: true });
      expect(mockTrashHandle.getFileHandle).toHaveBeenCalledWith('original.md');
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledWith('original.md');
      expect(result).toBe('original.md');
    });

    it('should append "restored" timestamp if original exists', async () => {
      storage.directoryHandle = mockDirectoryHandle;

      // Mock file exists at original location
      mockDirectoryHandle.getFileHandle
        .mockResolvedValueOnce(mockFileHandle)
        .mockResolvedValueOnce(mockFileHandle);

      const undoInfo = {
        from: 'original.md',
        to: '.trash/original.md'
      };

      const result = await storage.restoreItem(undoInfo);

      expect(result).toMatch(/^original-restored-\d+\.md$/);
    });

    it('should handle restore errors', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      mockTrashHandle.getFileHandle.mockRejectedValueOnce(new Error('Not found'));

      const undoInfo = { from: 'test.md', to: '.trash/test.md' };

      await expect(storage.restoreItem(undoInfo)).rejects.toThrow('Error restoring file');
    });
  });

  describe('_getOrCreateTrashDir', () => {
    it('should return existing trash handle if available', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      storage.trashHandle = mockTrashHandle;

      const result = await storage._getOrCreateTrashDir();

      expect(result).toBe(mockTrashHandle);
      expect(mockDirectoryHandle.getDirectoryHandle).not.toHaveBeenCalled();
    });

    it('should create and cache trash directory', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      storage.trashHandle = null;

      const result = await storage._getOrCreateTrashDir();

      expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('.trash', { create: true });
      expect(storage.trashHandle).toBe(mockTrashHandle);
      expect(result).toBe(mockTrashHandle);
    });

    it('should throw error if trash dir creation fails', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      mockDirectoryHandle.getDirectoryHandle.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(storage._getOrCreateTrashDir()).rejects.toThrow('Permission denied');
    });
  });

  describe('listTrash', () => {
    it('should throw error if not connected', async () => {
      await expect(storage.listTrash()).rejects.toThrow('Please select a directory first');
    });

    it('should list all items in trash', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const mockTrashEntries = [
        {
          kind: 'file',
          name: 'test-item.md',
          getFile: vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue('---\ntitle: Test\n---'),
            lastModified: 1234567890000,
            size: 1024
          })
        },
        {
          kind: 'file',
          name: 'another-item.md',
          getFile: vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue('---\ntitle: Another\n---'),
            lastModified: 1234567890000,
            size: 2048
          })
        }
      ];
      
      mockTrashHandle.values = vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entry of mockTrashEntries) {
            yield entry;
          }
        }
      });

      const items = await storage.listTrash();

      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        filename: 'test-item.md',
        title: 'Test Item',
        deletedAt: 1234567890000,
        size: 1024
      });
    });

    it('should handle errors loading individual trash items', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const mockTrashEntries = [
        {
          kind: 'file',
          name: 'test-item.md',
          getFile: vi.fn().mockRejectedValue(new Error('Read error'))
        }
      ];
      
      mockTrashHandle.values = vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entry of mockTrashEntries) {
            yield entry;
          }
        }
      });

      const items = await storage.listTrash();

      expect(items).toHaveLength(0);
    });
  });

  describe('restoreFromTrash', () => {
    it('should throw error if not connected', async () => {
      await expect(storage.restoreFromTrash('test.md')).rejects.toThrow('Please select a directory first');
    });

    it('should restore item from trash', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const mockTrashFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('test content')
        })
      };
      
      mockTrashHandle.getFileHandle = vi.fn().mockResolvedValue(mockTrashFileHandle);
      mockTrashHandle.removeEntry = vi.fn();
      mockDirectoryHandle.getFileHandle = vi.fn()
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(mockFileHandle);

      const result = await storage.restoreFromTrash('test.md');

      expect(result).toBe('test.md');
      expect(mockWritable.write).toHaveBeenCalledWith('test content');
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledWith('test.md');
    });

    it('should append timestamp if file already exists', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const mockTrashFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('test content')
        })
      };
      
      mockTrashHandle.getFileHandle = vi.fn().mockResolvedValue(mockTrashFileHandle);
      mockTrashHandle.removeEntry = vi.fn();
      mockDirectoryHandle.getFileHandle = vi.fn()
        .mockResolvedValueOnce(mockFileHandle)
        .mockResolvedValueOnce(mockFileHandle);

      const result = await storage.restoreFromTrash('test.md');

      expect(result).toMatch(/test-restored-\d+\.md/);
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledWith('test.md');
    });
  });

  describe('emptyTrash', () => {
    it('should throw error if not connected', async () => {
      await expect(storage.emptyTrash()).rejects.toThrow('Please select a directory first');
    });

    it('should delete all items in trash', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const mockTrashEntries = [
        { kind: 'file', name: 'test-1.md' },
        { kind: 'file', name: 'test-2.md' },
        { kind: 'file', name: 'test-3.md' }
      ];
      
      mockTrashHandle.values = vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entry of mockTrashEntries) {
            yield entry;
          }
        }
      });
      mockTrashHandle.removeEntry = vi.fn();

      const count = await storage.emptyTrash();

      expect(count).toBe(3);
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledTimes(3);
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledWith('test-1.md');
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledWith('test-2.md');
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledWith('test-3.md');
    });

    it('should continue on individual item deletion errors', async () => {
      storage.directoryHandle = mockDirectoryHandle;
      
      const mockTrashEntries = [
        { kind: 'file', name: 'test-1.md' },
        { kind: 'file', name: 'test-2.md' }
      ];
      
      mockTrashHandle.values = vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entry of mockTrashEntries) {
            yield entry;
          }
        }
      });
      mockTrashHandle.removeEntry = vi.fn()
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Delete failed'));

      const count = await storage.emptyTrash();

      expect(count).toBe(1);
      expect(mockTrashHandle.removeEntry).toHaveBeenCalledTimes(2);
    });
  });
});
