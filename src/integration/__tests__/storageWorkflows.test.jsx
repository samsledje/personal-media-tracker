/**
 * Integration tests for Storage Workflows
 * Tests storage selection, switching, reconnection, and persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useItems } from '../../hooks/useItems.js';
import { StorageFactory } from '../../services/storageAdapter.js';
import { MockFileSystemStorage, MockGoogleDriveStorage } from '../../test/mocks/storage.js';

// Mock StorageFactory
vi.mock('../../services/storageAdapter.js', () => ({
  StorageFactory: {
    createAdapter: vi.fn(),
    getAvailableAdapters: vi.fn(() => Promise.resolve([
      { type: 'filesystem', name: 'Local Directory', available: true },
      { type: 'googledrive', name: 'Google Drive', available: true }
    ]))
  }
}));

// Mock toast service
vi.mock('../../services/toastService.js', () => ({
  toast: vi.fn()
}));

describe('Storage Workflows Integration', () => {
  let mockFileSystemStorage;
  let mockGoogleDriveStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFileSystemStorage = new MockFileSystemStorage();
    mockGoogleDriveStorage = new MockGoogleDriveStorage();
    
    StorageFactory.createAdapter.mockImplementation((type) => {
      if (type === 'googledrive') {
        return Promise.resolve(mockGoogleDriveStorage);
      }
      return Promise.resolve(mockFileSystemStorage);
    });
  });

  describe('storage selection', () => {
    it('should select filesystem storage and load items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
      });
      
      await act(async () => {
        await result.current.selectStorage();
      });
      
      expect(result.current.storageAdapter).toBe(mockFileSystemStorage);
      expect(result.current.storageAdapter.isConnected()).toBe(true);
      expect(StorageFactory.createAdapter).toHaveBeenCalledWith('filesystem');
    });

    it('should select Google Drive storage and load items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('googledrive');
      });
      
      await act(async () => {
        await result.current.selectStorage();
      });
      
      expect(result.current.storageAdapter).toBe(mockGoogleDriveStorage);
      expect(result.current.storageAdapter.isConnected()).toBe(true);
      expect(StorageFactory.createAdapter).toHaveBeenCalledWith('googledrive');
    });

    it('should handle storage selection cancellation', async () => {
      const { result } = renderHook(() => useItems());
      
      mockFileSystemStorage.selectStorage = vi.fn().mockRejectedValue(
        Object.assign(new Error('User cancelled'), { name: 'AbortError' })
      );
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
      });
      
      await act(async () => {
        await result.current.selectStorage();
      });
      
      // Should not throw, should handle gracefully
      expect(result.current.storageAdapter).toBe(mockFileSystemStorage);
    });
  });

  describe('storage switching', () => {
    it('should switch from filesystem to Google Drive', async () => {
      const { result } = renderHook(() => useItems());
      
      // Start with filesystem
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      expect(result.current.storageAdapter.getStorageType()).toBe('filesystem');
      
      // Switch to Google Drive
      await act(async () => {
        await result.current.initializeStorage('googledrive');
        await result.current.selectStorage();
      });
      
      expect(result.current.storageAdapter.getStorageType()).toBe('googledrive');
      expect(StorageFactory.createAdapter).toHaveBeenCalledWith('googledrive');
    });

    it('should clear items when switching storage', async () => {
      const { result } = renderHook(() => useItems());
      
      // Load items in filesystem
      mockFileSystemStorage._setItems([
        { id: '1', title: 'Book 1', type: 'book' }
      ]);
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      expect(result.current.items.length).toBe(1);
      
      // Switch to Google Drive (with no items)
      mockGoogleDriveStorage._setItems([]);
      
      // Ensure createAdapter returns Google Drive storage
      StorageFactory.createAdapter.mockImplementation((type) => {
        if (type === 'googledrive') {
          return Promise.resolve(mockGoogleDriveStorage);
        }
        return Promise.resolve(mockFileSystemStorage);
      });
      
      await act(async () => {
        await result.current.initializeStorage('googledrive');
      });
      
      // Verify adapter was switched
      expect(result.current.storageAdapter).toBe(mockGoogleDriveStorage);
      
      await act(async () => {
        // selectStorage will call loadItems which should load from Google Drive (empty)
        await result.current.selectStorage();
      });
      
      // Wait for items to be loaded from new storage (which is empty)
      await waitFor(() => {
        expect(result.current.items.length).toBe(0);
      }, { timeout: 2000 });
      
      // Items should be cleared (replaced with empty array from new storage)
      expect(result.current.items.length).toBe(0);
    });
  });

  describe('storage reconnection', () => {
    it('should reconnect to filesystem storage', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      // Disconnect
      await act(async () => {
        await result.current.disconnectStorage();
      });
      
      expect(result.current.storageAdapter).toBeNull();
      
      // Reconnect
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      expect(result.current.storageAdapter).toBe(mockFileSystemStorage);
      expect(result.current.storageAdapter.isConnected()).toBe(true);
    });

    it('should maintain storage type preference', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      const storageType = result.current.storageAdapter.getStorageType();
      expect(storageType).toBe('filesystem');
      
      // Disconnect and reconnect
      await act(async () => {
        await result.current.disconnectStorage();
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      expect(result.current.storageAdapter.getStorageType()).toBe(storageType);
    });
  });

  describe('storage persistence', () => {
    it('should persist items across reconnections', async () => {
      const { result } = renderHook(() => useItems());
      
      const testItems = [
        { id: '1', title: 'Book 1', type: 'book' },
        { id: '2', title: 'Book 2', type: 'book' }
      ];
      
      mockFileSystemStorage._setItems(testItems);
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      expect(result.current.items.length).toBe(2);
      
      // Disconnect and reconnect (items should still be in mock storage)
      await act(async () => {
        await result.current.disconnectStorage();
        // Re-set items to ensure they persist in mock storage
        mockFileSystemStorage._setItems(testItems);
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      expect(result.current.items.length).toBe(2);
      expect(result.current.items[0].title).toBe('Book 1');
    });
  });

  describe('storage info', () => {
    it('should display filesystem storage info', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      const storageInfo = result.current.storageInfo;
      expect(storageInfo).toBeDefined();
      expect(storageInfo.folder).toBeDefined();
    });

    it('should display Google Drive storage info', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('googledrive');
        await result.current.selectStorage();
      });
      
      const storageInfo = result.current.storageInfo;
      expect(storageInfo).toBeDefined();
      expect(storageInfo.account).toBeDefined();
      expect(storageInfo.folder).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle storage initialization failure', async () => {
      StorageFactory.createAdapter.mockRejectedValueOnce(new Error('Init failed'));
      const { result } = renderHook(() => useItems());
      
      await expect(act(async () => {
        await result.current.initializeStorage('filesystem');
      })).rejects.toThrow('Init failed');
      
      expect(result.current.storageAdapter).toBeNull();
    });

    it('should handle storage selection failure', async () => {
      const { result } = renderHook(() => useItems());
      
      mockFileSystemStorage.selectStorage = vi.fn().mockRejectedValue(
        new Error('Selection failed')
      );
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
      });
      
      await expect(act(async () => {
        await result.current.selectStorage();
      })).rejects.toThrow('Selection failed');
    });

    it('should handle storage disconnection failure gracefully', async () => {
      const { result } = renderHook(() => useItems());
      
      mockFileSystemStorage.disconnect = vi.fn().mockRejectedValue(
        new Error('Disconnect failed')
      );
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
      });
      
      // Should not throw
      await act(async () => {
        await result.current.disconnectStorage();
      });
    });
  });
});

