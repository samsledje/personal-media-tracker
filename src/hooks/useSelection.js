import { useState } from 'react';

/**
 * Custom hook for managing item selection
 * @returns {object} Selection state and actions
 */
export const useSelection = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  /**
   * Toggle selection mode
   */
  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    if (!newMode) {
      setSelectedIds(new Set());
    }
  };

  /**
   * Toggle selection of a specific item
   */
  const toggleItemSelection = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Select all items
   */
  const selectAll = (items) => {
    setSelectedIds(new Set((items || []).map(item => item.id)));
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  /**
   * Check if an item is selected
   */
  const isItemSelected = (id) => {
    return selectedIds.has(id);
  };

  /**
   * Get selected items from a list
   */
  const getSelectedItems = (items) => {
    return items.filter(item => selectedIds.has(item.id));
  };

  return {
    selectionMode,
    selectedIds, // Export the Set directly for efficient lookups
    selectedCount: selectedIds.size,
    toggleSelectionMode,
    toggleItemSelection,
    selectAll,
    clearSelection,
    isItemSelected,
    getSelectedItems
  };
};