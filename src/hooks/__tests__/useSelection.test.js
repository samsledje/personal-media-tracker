import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';
import { sampleBook, sampleMovie, sampleBookUnrated, sampleMovieWatchlist } from '../../test/fixtures/sampleItems.js';

describe('useSelection', () => {
  const sampleItems = [sampleBook, sampleMovie, sampleBookUnrated, sampleMovieWatchlist];

  describe('initialization', () => {
    it('should initialize with selection mode off', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectionMode).toBe(false);
    });

    it('should initialize with no selected items', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should have selectedIds as a Set', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedIds).toBeInstanceOf(Set);
    });
  });

  describe('toggleSelectionMode', () => {
    it('should toggle selection mode on', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelectionMode();
      });

      expect(result.current.selectionMode).toBe(true);
    });

    it('should toggle selection mode off', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelectionMode();
      });
      expect(result.current.selectionMode).toBe(true);

      act(() => {
        result.current.toggleSelectionMode();
      });
      expect(result.current.selectionMode).toBe(false);
    });

    it('should clear selections when toggling mode off', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelectionMode();
        result.current.toggleItemSelection('test-1');
        result.current.toggleItemSelection('test-2');
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.toggleSelectionMode();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectionMode).toBe(false);
    });
  });

  describe('toggleItemSelection', () => {
    it('should select an item', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('test-book-1');
      });

      expect(result.current.isItemSelected('test-book-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should deselect an item', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('test-book-1');
      });
      expect(result.current.isItemSelected('test-book-1')).toBe(true);

      act(() => {
        result.current.toggleItemSelection('test-book-1');
      });
      expect(result.current.isItemSelected('test-book-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should handle multiple item selections', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('test-book-1');
        result.current.toggleItemSelection('test-movie-1');
        result.current.toggleItemSelection('test-book-2');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isItemSelected('test-book-1')).toBe(true);
      expect(result.current.isItemSelected('test-movie-1')).toBe(true);
      expect(result.current.isItemSelected('test-book-2')).toBe(true);
    });

    it('should maintain selection Set correctly', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('id-1');
        result.current.toggleItemSelection('id-2');
        result.current.toggleItemSelection('id-3');
        result.current.toggleItemSelection('id-2'); // Deselect id-2
      });

      expect(result.current.selectedIds.has('id-1')).toBe(true);
      expect(result.current.selectedIds.has('id-2')).toBe(false);
      expect(result.current.selectedIds.has('id-3')).toBe(true);
      expect(result.current.selectedCount).toBe(2);
    });
  });

  describe('selectAll', () => {
    it('should select all items', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(sampleItems);
      });

      expect(result.current.selectedCount).toBe(4);
      sampleItems.forEach(item => {
        expect(result.current.isItemSelected(item.id)).toBe(true);
      });
    });

    it('should handle empty array', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll([]);
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should not throw when called with undefined', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(undefined);
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should override previous selections', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('old-id');
      });
      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.selectAll(sampleItems);
      });

      expect(result.current.selectedCount).toBe(4);
      expect(result.current.isItemSelected('old-id')).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(sampleItems);
      });
      expect(result.current.selectedCount).toBe(4);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectionMode).toBe(false);
    });

    it('should turn off selection mode', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelectionMode();
        result.current.toggleItemSelection('test-id');
      });

      expect(result.current.selectionMode).toBe(true);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('isItemSelected', () => {
    it('should return true for selected items', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('test-id');
      });

      expect(result.current.isItemSelected('test-id')).toBe(true);
    });

    it('should return false for unselected items', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isItemSelected('test-id')).toBe(false);
    });

    it('should return false after deselection', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection('test-id');
        result.current.toggleItemSelection('test-id');
      });

      expect(result.current.isItemSelected('test-id')).toBe(false);
    });
  });

  describe('getSelectedItems', () => {
    it('should return selected items', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection(sampleBook.id);
        result.current.toggleItemSelection(sampleMovie.id);
      });

      const selectedItems = result.current.getSelectedItems(sampleItems);

      expect(selectedItems).toHaveLength(2);
      expect(selectedItems[0].id).toBe(sampleBook.id);
      expect(selectedItems[1].id).toBe(sampleMovie.id);
    });

    it('should return empty array when nothing is selected', () => {
      const { result } = renderHook(() => useSelection());

      const selectedItems = result.current.getSelectedItems(sampleItems);

      expect(selectedItems).toEqual([]);
    });

    it('should return all items when all are selected', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(sampleItems);
      });

      const selectedItems = result.current.getSelectedItems(sampleItems);

      expect(selectedItems).toHaveLength(4);
      expect(selectedItems).toEqual(sampleItems);
    });

    it('should filter correctly after partial selection', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleItemSelection(sampleBook.id);
        result.current.toggleItemSelection(sampleMovieWatchlist.id);
      });

      const selectedItems = result.current.getSelectedItems(sampleItems);

      expect(selectedItems).toHaveLength(2);
      expect(selectedItems.some(item => item.id === sampleBook.id)).toBe(true);
      expect(selectedItems.some(item => item.id === sampleMovieWatchlist.id)).toBe(true);
      expect(selectedItems.some(item => item.id === sampleMovie.id)).toBe(false);
    });
  });

  describe('selectedCount', () => {
    it('should track count correctly', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedCount).toBe(0);

      act(() => {
        result.current.toggleItemSelection('id-1');
      });
      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.toggleItemSelection('id-2');
      });
      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.toggleItemSelection('id-1'); // Deselect
      });
      expect(result.current.selectedCount).toBe(1);
    });

    it('should match selectedIds.size', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(sampleItems);
      });

      expect(result.current.selectedCount).toBe(result.current.selectedIds.size);
    });
  });
});
