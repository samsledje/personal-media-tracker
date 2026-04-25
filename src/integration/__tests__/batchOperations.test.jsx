/**
 * Integration tests for Batch Operations
 * Tests batch edit, delete, and restore workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useItems } from '../../hooks/useItems.js';
import { StorageFactory } from '../../services/storageAdapter.js';
import { MockFileSystemStorage } from '../../test/mocks/storage.js';

// Mock dependencies
vi.mock('../../services/storageAdapter.js', () => ({
  StorageFactory: {
    createAdapter: vi.fn(),
    getAvailableAdapters: vi.fn(() => Promise.resolve([
      { type: 'filesystem', name: 'Local Directory', available: true }
    ]))
  }
}));

vi.mock('../../services/toastService.js', () => ({
  toast: vi.fn()
}));

describe('Batch Operations Integration', () => {
  let mockStorage;
  const sampleItems = [
    { id: '1', title: 'Book 1', type: 'book', rating: 3, tags: ['fiction'] },
    { id: '2', title: 'Book 2', type: 'book', rating: 4, tags: ['classic'] },
    { id: '3', title: 'Movie 1', type: 'movie', rating: 5, tags: ['action'] },
    { id: '4', title: 'Movie 2', type: 'movie', rating: 2, tags: ['comedy'] }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStorage = new MockFileSystemStorage();
    mockStorage._setItems([...sampleItems]);
    
    StorageFactory.createAdapter.mockResolvedValue(mockStorage);
  });

  describe('batch edit', () => {
    it('should apply changes to multiple items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      const itemIds = ['1', '2'];
      const changes = { rating: 5 };
      
      await act(async () => {
        await result.current.applyBatchEdit(itemIds, changes);
      });
      
      const updatedItems = result.current.items.filter(item => itemIds.includes(item.id));
      updatedItems.forEach(item => {
        expect(item.rating).toBe(5);
      });
    });

    it('should add tags to multiple items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      const itemIds = ['1', '2'];
      const changes = { addTags: ['favorite'] };
      
      await act(async () => {
        await result.current.applyBatchEdit(itemIds, changes);
      });
      
      const updatedItems = result.current.items.filter(item => itemIds.includes(item.id));
      updatedItems.forEach(item => {
        expect(item.tags).toContain('favorite');
      });
    });

    it('should remove tags from multiple items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      const itemIds = ['1'];
      const changes = { removeTags: ['fiction'] };
      
      await act(async () => {
        await result.current.applyBatchEdit(itemIds, changes);
      });
      
      const updatedItem = result.current.items.find(item => item.id === '1');
      expect(updatedItem.tags).not.toContain('fiction');
    });

    it('should handle batch edit for many items', async () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        type: 'book',
        rating: 0
      }));
      
      mockStorage._setItems(manyItems);
      
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      const itemIds = manyItems.slice(0, 25).map(item => item.id);
      const changes = { rating: 5 };
      
      await act(async () => {
        await result.current.applyBatchEdit(itemIds, changes);
      });
      
      const updatedItems = result.current.items.filter(item => itemIds.includes(item.id));
      expect(updatedItems.every(item => item.rating === 5)).toBe(true);
    });
  });

  describe('batch delete', () => {
    it('should delete multiple items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      expect(result.current.items.length).toBe(4);
      
      const itemsToDelete = [
        result.current.items[0],
        result.current.items[1]
      ];
      
      await act(async () => {
        await result.current.deleteItems(itemsToDelete);
      });
      
      expect(result.current.items.length).toBe(2);
      expect(result.current.undoStack).toBe(2);
    });

    it('should handle batch delete for many items', async () => {
      const manyItems = Array.from({ length: 30 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        type: 'book'
      }));
      
      mockStorage._setItems(manyItems);
      
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      const itemsToDelete = manyItems.slice(0, 20);
      
      await act(async () => {
        await result.current.deleteItems(itemsToDelete);
      });
      
      expect(result.current.items.length).toBe(10);
      expect(result.current.undoStack).toBe(20);
    });
  });

  describe('batch restore', () => {
    it('should restore multiple deleted items', async () => {
      const { result } = renderHook(() => useItems());
      
      await act(async () => {
        await result.current.initializeStorage('filesystem');
        await result.current.selectStorage();
        await result.current.loadItems();
      });
      
      const itemsToDelete = [
        result.current.items[0],
        result.current.items[1]
      ];
      
      await act(async () => {
        await result.current.deleteItems(itemsToDelete);
      });
      
      expect(result.current.items.length).toBe(2);
      expect(result.current.undoStack).toBe(2);
      
      // Restore items one by one
      await act(async () => {
        await result.current.undoLastDelete();
      });
      
      expect(result.current.items.length).toBe(3);
      expect(result.current.undoStack).toBe(1);
      
      await act(async () => {
        await result.current.undoLastDelete();
      });
      
      expect(result.current.items.length).toBe(4);
      expect(result.current.undoStack).toBe(0);
    });
  });
});

