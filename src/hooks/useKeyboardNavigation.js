import { useState, useEffect, useRef } from 'react';
import { isTyping } from '../utils/commonUtils.js';
import { KEYBOARD_SHORTCUTS, GRID_COLUMNS_BY_SIZE } from '../constants/index.js';

/**
 * Custom hook for managing keyboard navigation and shortcuts
 * @param {object} config - Configuration object
 * @returns {object} Navigation state and handlers
 */
export const useKeyboardNavigation = ({
  items = [],
  cardSize = 'medium',
  storageAdapter = null,
  onOpenHelp = () => {},
  onFocusSearch = () => {},
  onAddItem = () => {},
  onSearchOnline = () => {},
  onToggleFilters = () => {},
  onToggleCustomize = () => {},
  onSwitchStorage = () => {},
  onFilterAll = () => {},
  onFilterBooks = () => {},
  onFilterMovies = () => {},
  onToggleSelectionMode = () => {},
  onSelectAll = () => {},
  onDeleteSelected = () => {},
  onToggleItemSelection = () => {},
  onOpenItem = () => {},
  onCloseModals = () => {},
  onCloseBatchDeleteModal = () => {},
  onConfirmBatchDelete = () => {},
  selectionMode = false,
  selectedCount = 0,
  // Modal states - when any of these are true, main shortcuts are disabled
  hasOpenModal = false,
  // Individual modal states for toggle functionality
  showHelp = false,
  showBatchDeleteConfirm = false
} = {}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [focusedId, setFocusedId] = useState(null);
  const cardRefs = useRef({});

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape: close modals, clear search/selection (works always)
      if (e.key === KEYBOARD_SHORTCUTS.ESCAPE) {
        // If the batch delete confirmation modal is open, close it specifically
        // without exiting selection mode
        if (showBatchDeleteConfirm) {
          onCloseBatchDeleteModal();
        } else {
          onCloseModals();
        }
        return;
      }

      // Enter: confirm batch delete when the confirmation modal is open
      if (e.key === KEYBOARD_SHORTCUTS.ENTER && showBatchDeleteConfirm) {
        e.preventDefault();
        onConfirmBatchDelete();
        return;
      }

      // Don't run main window shortcuts while typing in inputs/textareas
      if (isTyping()) return;

      const key = e.key;

      // Allow toggle shortcuts even when modals are open
      // Show help: ? (toggle)
      if (key === KEYBOARD_SHORTCUTS.HELP) {
        e.preventDefault();
        onOpenHelp();
        return;
      }

      // Toggle customize: C (toggle)
      if (key.toLowerCase() === KEYBOARD_SHORTCUTS.CUSTOMIZE) {
        e.preventDefault();
        onToggleCustomize();
        return;
      }

      // Switch storage: T (always works)
      if (key.toLowerCase() === KEYBOARD_SHORTCUTS.SWITCH_STORAGE) {
        e.preventDefault();
        onSwitchStorage();
        return;
      }

      // Don't run other main window shortcuts when a modal is open
      if (hasOpenModal) return;

      // Focus search: / or Ctrl/Cmd+K
      if ((key === KEYBOARD_SHORTCUTS.SEARCH && !e.ctrlKey && !e.metaKey) || 
          ((e.ctrlKey || e.metaKey) && key.toLowerCase() === KEYBOARD_SHORTCUTS.SEARCH_ALT)) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // Filter shortcuts: A (all), B (books), M (movies) - only when storage is connected
      if (storageAdapter && storageAdapter.isConnected()) {
        if (key.toLowerCase() === KEYBOARD_SHORTCUTS.FILTER_ALL && !selectionMode) {
          e.preventDefault();
          onFilterAll();
          return;
        }
        if (key.toLowerCase() === KEYBOARD_SHORTCUTS.FILTER_BOOKS) {
          e.preventDefault();
          onFilterBooks();
          return;
        }
        if (key.toLowerCase() === KEYBOARD_SHORTCUTS.FILTER_MOVIES) {
          e.preventDefault();
          onFilterMovies();
          return;
        }
      }

      // Storage-dependent shortcuts
      if (storageAdapter && storageAdapter.isConnected()) {
        if (key.toLowerCase() === KEYBOARD_SHORTCUTS.ADD) {
          e.preventDefault();
          onAddItem();
          return;
        }
        if (key.toLowerCase() === KEYBOARD_SHORTCUTS.ONLINE_SEARCH) {
          e.preventDefault();
          onSearchOnline();
          return;
        }
      }

      // Toggle filters: F
      if (key.toLowerCase() === KEYBOARD_SHORTCUTS.FILTERS) {
        e.preventDefault();
        onToggleFilters();
        return;
      }

      // Toggle selection mode: V
      if (key.toLowerCase() === KEYBOARD_SHORTCUTS.SELECTION_MODE) {
        e.preventDefault();
        onToggleSelectionMode();
        return;
      }

      // Select all visible: Ctrl/Cmd+A
      if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === KEYBOARD_SHORTCUTS.SELECT_ALL) {
        if (selectionMode) {
          e.preventDefault();
          onSelectAll();
        }
        return;
      }

      // Delete selected: Delete / Backspace
      if ((key === KEYBOARD_SHORTCUTS.DELETE || key === KEYBOARD_SHORTCUTS.BACKSPACE) && 
          selectionMode && selectedCount > 0) {
        e.preventDefault();
        onDeleteSelected();
        return;
      }

      // Item navigation and activation (Arrow keys + vim-style navigation)
      if (items.length > 0 && [
        KEYBOARD_SHORTCUTS.ARROW_LEFT,
        KEYBOARD_SHORTCUTS.ARROW_RIGHT,
        KEYBOARD_SHORTCUTS.ARROW_UP,
        KEYBOARD_SHORTCUTS.ARROW_DOWN,
        KEYBOARD_SHORTCUTS.ENTER,
        KEYBOARD_SHORTCUTS.SPACE,
        'h', 'j', 'k', 'l' // vim-style navigation (h=left, j=down, k=up, l=right)
      ].includes(key) || ['h', 'j', 'k', 'l'].includes(key.toLowerCase())) {
        e.preventDefault();
        
        let idx = focusedIndex;
        if (idx < 0) idx = 0;
        
        // Calculate actual columns by examining the DOM layout
        const getActualColumns = () => {
          if (items.length === 0) return 1;
          
          // Get the first two card elements to calculate actual column layout
          const firstCard = cardRefs.current[items[0]?.id];
          const secondCard = cardRefs.current[items[1]?.id];
          
          if (!firstCard || !secondCard) {
            // Fallback to constants if DOM refs aren't available
            return GRID_COLUMNS_BY_SIZE[cardSize] || 3;
          }
          
          // Check if cards are on the same row by comparing their top positions
          const firstRect = firstCard.getBoundingClientRect();
          const secondRect = secondCard.getBoundingClientRect();
          
          // If they have roughly the same top position, they're in the same row
          const tolerance = 10; // Allow small differences due to line height, etc.
          const sameRow = Math.abs(firstRect.top - secondRect.top) < tolerance;
          
          if (!sameRow) {
            // If first two items are not in same row, we have 1 column
            return 1;
          }
          
          // Count how many items are in the first row
          let cols = 1;
          for (let i = 1; i < Math.min(items.length, 12); i++) { // Check up to 12 items max
            const card = cardRefs.current[items[i]?.id];
            if (!card) break;
            
            const cardRect = card.getBoundingClientRect();
            if (Math.abs(cardRect.top - firstRect.top) < tolerance) {
              cols++;
            } else {
              break; // Found an item in a different row
            }
          }
          
          return cols;
        };
        
        const cols = getActualColumns();

        if (key === KEYBOARD_SHORTCUTS.ARROW_LEFT || key.toLowerCase() === 'h') {
          idx = Math.max(0, idx - 1);
        } else if (key === KEYBOARD_SHORTCUTS.ARROW_RIGHT || key.toLowerCase() === 'l') {
          idx = Math.min(items.length - 1, idx + 1);
        } else if (key === KEYBOARD_SHORTCUTS.ARROW_UP || key.toLowerCase() === 'k') {
          // Move up: find the item in the same column (visual position)
          const currentColumn = idx % cols;
          let targetIdx = idx - cols;
          
          // If we'd go to a negative index, find the item in the same column from the top
          if (targetIdx < 0) {
            // Stay in the same column but go to the last possible row
            targetIdx = currentColumn;
            while (targetIdx + cols < items.length) {
              targetIdx += cols;
            }
            // If this position exceeds our items, go back one row
            if (targetIdx >= items.length) {
              targetIdx = Math.max(0, targetIdx - cols);
            }
          }
          idx = targetIdx;
        } else if (key === KEYBOARD_SHORTCUTS.ARROW_DOWN || key.toLowerCase() === 'j') {
          // Move down: find the item in the same column (visual position)
          const currentColumn = idx % cols;
          let targetIdx = idx + cols;
          
          // If we'd exceed the items length, wrap to the same column at the top
          if (targetIdx >= items.length) {
            targetIdx = currentColumn;
          }
          idx = targetIdx;
        } else if (key === KEYBOARD_SHORTCUTS.ENTER || key === KEYBOARD_SHORTCUTS.SPACE) {
          const item = items[focusedIndex >= 0 ? focusedIndex : 0];
          if (item) {
            if (selectionMode) {
              // In selection mode, toggle selection instead of opening detail
              onToggleItemSelection(item.id);
            } else {
              // In normal mode, open the item detail
              onOpenItem(item);
            }
          }
          return;
        }

        setFocusedIndex(idx);
        const id = items[idx]?.id;
        setFocusedId(id || null);
        
        // Smoothly scroll the focused card into view
        if (id && cardRefs.current[id]) {
          cardRefs.current[id].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    items,
    cardSize,
    storageAdapter,
    focusedIndex,
    selectionMode,
    selectedCount,
    hasOpenModal,
    showHelp,
    showBatchDeleteConfirm,
    onOpenHelp,
    onFocusSearch,
    onAddItem,
    onSearchOnline,
    onToggleFilters,
    onToggleCustomize,
    onSwitchStorage,
    onFilterAll,
    onFilterBooks,
    onFilterMovies,
    onToggleSelectionMode,
    onSelectAll,
    onDeleteSelected,
    onToggleItemSelection,
    onOpenItem,
    onCloseModals,
    onCloseBatchDeleteModal,
    onConfirmBatchDelete
  ]);

  /**
   * Register a card ref
   */
  const registerCardRef = (id, element) => {
    if (element) {
      cardRefs.current[id] = element;
    } else {
      delete cardRefs.current[id];
    }
  };

  /**
   * Check if an item is focused
   */
  const isItemFocused = (id) => {
    return focusedId === id;
  };

  /**
   * Reset focus
   */
  const resetFocus = () => {
    setFocusedIndex(-1);
    setFocusedId(null);
  };

  return {
    focusedIndex,
    focusedId, // Export focusedId directly for efficient comparisons
    registerCardRef,
    isItemFocused,
    resetFocus
  };
};