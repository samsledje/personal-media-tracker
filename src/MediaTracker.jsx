import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Book, Film, Search, Plus, Star, Tag, Calendar, User, Hash, X, FolderOpen, Save, ChevronDown, ChevronUp, ChevronRight, Palette, CheckSquare, SlidersHorizontal, ArrowUpDown, Download, Upload, Key, Cloud, Wifi, WifiOff, ArrowLeft, Bookmark, BookOpen, CheckCircle, PlayCircle, Layers, Trash2, AlertCircle, Settings, XCircle } from 'lucide-react';

// Hooks
import { useItems } from './hooks/useItems.js';
import { useFilters } from './hooks/useFilters.js';
import { useSelection } from './hooks/useSelection.js';
import { useTheme } from './hooks/useTheme.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { useOmdbApi } from './hooks/useOmdbApi.js';
import { useHalfStars } from './hooks/useHalfStars.js';

// Components
import SearchModal from './components/modals/SearchModal.jsx';
import HelpModal from './components/modals/HelpModal.jsx';
import BatchEditModal from './components/modals/BatchEditModal.jsx';
import ItemDetailModal from './components/modals/ItemDetailModal.jsx';
import AddEditModal from './components/modals/AddEditModal.jsx';
import ApiKeyModal from './components/modals/ApiKeyModal.jsx';
import ObsidianBaseModal from './components/modals/ObsidianBaseModal.jsx';
import FilterModal from './components/modals/FilterModal.jsx';
import TrashModal from './components/modals/TrashModal.jsx';
import LandingPage from './components/LandingPage.jsx';
import StorageIndicator from './components/StorageIndicator.jsx';
import ItemCard from './components/cards/ItemCard.jsx';

// Utils
import { hexToRgba } from './utils/colorUtils.js';
import { exportCSV } from './utils/csvUtils.js';
import { OBSIDIAN_BASE_CONTENT, OBSIDIAN_BASE_FILENAME } from './services/obsidianBase.js';
import { processImportFile } from './utils/importUtils.js';
import { hasApiKey } from './config.js';
import { toast } from './services/toastService.js';

// Constants
import { PRIMARY_COLOR_PRESETS, HIGHLIGHT_COLOR_PRESETS } from './constants/colors.js';
import { STATUS_LABELS, STATUS_ICONS, STATUS_COLORS } from './constants/index.js';

/**
 * Get the icon component for a given status
 */
const getStatusIcon = (status, className = '') => {
  const iconType = STATUS_ICONS[status];
  switch (iconType) {
    case 'bookmark':
      return <Bookmark className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'check-circle':
      return <CheckCircle className={className} />;
    case 'play-circle':
      return <PlayCircle className={className} />;
    case 'x-circle':
      return <XCircle className={className} />;
    default:
      return <Bookmark className={className} />;
  }
};

/**
 * Get color class for status badge
 */
const getStatusColorClass = (status) => {
  const colorType = STATUS_COLORS[status];
  switch (colorType) {
    case 'blue':
      return 'bg-blue-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'green':
      return 'bg-green-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};

/**
 * Export utility functions for filtering items by type
 */
const exportAllItems = (items) => {
  exportCSV(items);
};

const exportBooks = (items) => {
  const books = items.filter(item => item.type === 'book');
  exportCSV(books);
};

const exportMovies = (items) => {
  const movies = items.filter(item => item.type === 'movie');
  exportCSV(movies);
};

const MediaTracker = () => {
  // Modal states
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
  // Import progress state
  const [isImporting, setIsImporting] = useState(false);
  const [importProcessed, setImportProcessed] = useState(0);
  const [importAdded, setImportAdded] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importCurrentFile, setImportCurrentFile] = useState('');
  const [importOmdbError, setImportOmdbError] = useState(null);
  const [importOmdbErrorResolver, setImportOmdbErrorResolver] = useState(null);
  // Delete progress state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteTotal, setDeleteTotal] = useState(0);
  // Batch edit progress state
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editProgress, setEditProgress] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [searchResultItem, setSearchResultItem] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [availableStorageOptions, setAvailableStorageOptions] = useState([]);
  const [showStorageSelector, setShowStorageSelector] = useState(true);

  // Refs
  const searchInputRef = useRef(null);
  const filterButtonRef = useRef(null);
  const menuRef = useRef(null);
  const storageIndicatorRef = useRef(null);
  const landingPageRef = useRef(null);
  const exportSubmenuTimeoutRef = useRef(null);
  const exportContainerRef = useRef(null);
  const settingsSubmenuTimeoutRef = useRef(null);
  const settingsContainerRef = useRef(null);
  const importAbortControllerRef = useRef(null);
  const headerRef = useRef(null);
  const touchMovedRef = useRef(false);
  const touchStartedOnButtonRef = useRef(false);

  // Menu positioning
  const [menuPos, setMenuPos] = useState(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [exportSubmenuPosition, setExportSubmenuPosition] = useState('right');
  const [settingsSubmenuPosition, setSettingsSubmenuPosition] = useState('right');

  // Custom hooks
  const {
    items,
    storageAdapter,
    storageInfo,
    isLoading,
    loadProgress,
    undoStack,
    initializeStorage,
    loadItems,
    saveItem,
    deleteItem,
    deleteItems,
    undoLastDelete,
    selectStorage,
    disconnectStorage,
    getAvailableStorageOptions,
    applyBatchEdit
  } = useItems();

  const {
    searchTerm,
    filterType,
    sortBy,
    sortOrder,
    filterRating,
    filterMaxRating,
    filterHasReview,
    filterHasCover,
    filterTags,
    filterStatuses,
    filterRecent,
    filterStartDate,
    filterEndDate,
    showFilters,
    allTags,
    allStatuses,
    hasActiveFilters,
    filteredAndSortedItems,
    setSearchTerm,
    setFilterType,
    setSortBy,
    setSortOrder,
    setFilterRating,
    setFilterMaxRating,
    setFilterHasReview,
    setFilterHasCover,
    setFilterTags,
    setFilterStatuses,
    setFilterRecent,
    setFilterStartDate,
    setFilterEndDate,
    setShowFilters,
    toggleTagFilter,
    toggleStatusFilter,
    clearFilters,
    cycleFilterType,
    toggleSortOrder
  } = useFilters(items);

  const {
    selectionMode,
    selectedIds, // Used directly for performance
    selectedCount,
    toggleSelectionMode,
    toggleItemSelection,
    selectAll,
    clearSelection,
    isItemSelected, // Keep for non-rendering uses
    getSelectedItems
  } = useSelection();

  const {
    primaryColor,
    highlightColor,
    cardSize,
    updatePrimaryColor,
    updateHighlightColor,
    updateCardSize
  } = useTheme();

  const { omdbApiKey, updateApiKey } = useOmdbApi();

  const [halfStarsEnabled, setHalfStarsEnabled] = useHalfStars();

  // Close modals and clear states
  const closeModals = () => {
    setMenuOpen(false);
    setCustomizeOpen(false);
    setExportSubmenuOpen(false);
    setShowHelp(false);
    setIsAdding(false);
    setIsSearching(false);
    setSelectedItem(null);
    setShowBatchEdit(false);
    setShowApiKeyManager(false);
    if (storageIndicatorRef.current) {
      storageIndicatorRef.current.closeModal();
    }
    if (searchTerm) setSearchTerm('');
    if (selectionMode) clearSelection();
  };

  // Export submenu hover handlers
  const handleExportSubmenuEnter = () => {
    if (exportSubmenuTimeoutRef.current) {
      clearTimeout(exportSubmenuTimeoutRef.current);
    }
    calculateExportSubmenuPosition();
    setExportSubmenuOpen(true);
  };

  const handleExportSubmenuLeave = () => {
    exportSubmenuTimeoutRef.current = setTimeout(() => {
      setExportSubmenuOpen(false);
    }, 100);
  };

  // Settings submenu hover handlers
  const handleSettingsSubmenuEnter = () => {
    if (settingsSubmenuTimeoutRef.current) {
      clearTimeout(settingsSubmenuTimeoutRef.current);
    }
    calculateSettingsSubmenuPosition();
    setSettingsSubmenuOpen(true);
  };

  const handleSettingsSubmenuLeave = () => {
    settingsSubmenuTimeoutRef.current = setTimeout(() => {
      setSettingsSubmenuOpen(false);
    }, 100);
  };

  // Calculate optimal position for export submenu
  const calculateExportSubmenuPosition = () => {
    if (!exportContainerRef.current) return;

    const containerRect = exportContainerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const submenuWidth = 160; // min-w-[160px]
    const spacing = 8; // ml-2/mr-2
    const buffer = 16; // Extra buffer from screen edge

    // Check if submenu would overflow on the right
    const rightEdge = containerRect.right + spacing + submenuWidth + buffer;

    if (rightEdge > viewportWidth) {
      // Position to the left
      setExportSubmenuPosition('left');
    } else {
      // Position to the right (default)
      setExportSubmenuPosition('right');
    }
  };

  // Calculate optimal position for settings submenu
  const calculateSettingsSubmenuPosition = () => {
    if (!settingsContainerRef.current) return;

    const containerRect = settingsContainerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const submenuWidth = 160; // min-w-[160px]
    const spacing = 8; // ml-2/mr-2
    const buffer = 16; // Extra buffer from screen edge

    // Check if submenu would overflow on the right
    const rightEdge = containerRect.right + spacing + submenuWidth + buffer;

    if (rightEdge > viewportWidth) {
      // Position to the left
      setSettingsSubmenuPosition('left');
    } else {
      // Position to the right (default)
      setSettingsSubmenuPosition('right');
    }
  };

  // Focus search input
  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      const val = searchInputRef.current.value || '';
      searchInputRef.current.setSelectionRange(val.length, val.length);
    }
  };

  // Open/toggle storage indicator modal
  const openStorageIndicator = () => {
    if (storageIndicatorRef.current) {
      // Close other modals first
      setShowHelp(false);
      setCustomizeOpen(false);
      // Then toggle storage modal
      storageIndicatorRef.current.toggleModal();
    }
  };

  // Handle clearing Google Drive cache
  const handleClearCache = async () => {
    if (!storageAdapter || storageAdapter.getStorageType() !== 'googledrive') return;

    try {
      await storageAdapter.clearCache();
      toast('Cache cleared! Reloading fresh data...', { type: 'success' });

      // Reload items after clearing cache
      setTimeout(() => {
        loadItems();
      }, 500);

      // Close menu
      setMenuOpen(false);
      setSettingsSubmenuOpen(false);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast('Failed to clear cache', { type: 'error' });
    }
  };

  // Handle item selection on card click (memoized to prevent re-renders)
  const handleItemClick = useCallback((item, e) => {
    if (selectionMode) {
      toggleItemSelection(item.id);
    } else if (e.shiftKey) {
      if (!selectionMode) toggleSelectionMode();
      toggleItemSelection(item.id);
    } else {
      setSelectedItem(item);
    }
  }, [selectionMode, toggleItemSelection, toggleSelectionMode]);

  // Since toggleTagFilter and toggleStatusFilter are now memoized in useFilters,
  // we can use them directly without wrapping. But for setters, we still need to wrap.

  // Handle file import (CSV or ZIP)
  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!storageAdapter || !storageAdapter.isConnected()) {
      toast('Please connect to a storage location first', { type: 'error' });
      e.target.value = '';
      return;
    }

    // Create an AbortController for this import
    const abortController = new AbortController();
    importAbortControllerRef.current = abortController;

    try {
      setIsImporting(true);
      setImportProcessed(0);
      setImportAdded(0);
      setImportTotal(0);
      setImportCurrentFile('');

      let lastProgressUpdate = Date.now();
      const progressThrottleMs = 100; // Update UI at most every 100ms

      const progressCb = ({ processed, added, total, currentFile, filesCompleted, totalFiles }) => {
        const now = Date.now();
        // Always update on first/last item, otherwise throttle
        const isFirstOrLast = processed === 0 || processed === total;

        if (isFirstOrLast || now - lastProgressUpdate >= progressThrottleMs) {
          setImportProcessed(processed);
          setImportAdded(added);
          setImportTotal(total);
          if (currentFile) {
            setImportCurrentFile(currentFile);
          }
          lastProgressUpdate = now;
        }
      };

      // API error handler (OMDB/OpenLibrary) - pauses import and asks user what to do
      const handleAPIError = async (error) => {
        // If there's already an error showing, wait for it to be resolved first
        if (importOmdbError) {
          console.warn('[Import] API error occurred while another error modal is showing');
          return { continue: false, skipEnrichment: false };
        }

        return new Promise((resolve) => {
          setImportOmdbError(error);
          // Store the resolve function directly, not wrapped
          setImportOmdbErrorResolver({ resolve });
        });
      };

      // Create a batch-optimized saveItem that doesn't reload after each save
      // We'll reload once at the end instead
      const batchSaveItem = async (item) => {
        if (!storageAdapter || !storageAdapter.isConnected()) {
          throw new Error('Please connect to a storage location first');
        }
        // Just save without reloading
        await storageAdapter.saveItem(item);
      };

      const result = await processImportFile(file, items, batchSaveItem, progressCb, abortController.signal, handleAPIError);
      const { added, format, filesProcessed } = result;

      // Reload items once at the end (much more efficient than reloading after each save)
      if (added > 0) {
        await loadItems();
      }

      let message = `Imported ${added} items (detected format: ${format})`;
      if (filesProcessed && filesProcessed.length > 1) {
        message += `\nProcessed files: ${filesProcessed.join(', ')}`;
      }

      toast(message, { type: 'success' });
    } catch (error) {
      // Don't show error toast for user-initiated abort
      if (error.name !== 'AbortError') {
        toast(error.message, { type: 'error' });
      } else {
        console.log('[Import] Import cancelled by user');
      }
    } finally {
      setIsImporting(false);
      importAbortControllerRef.current = null;
      setImportOmdbError(null);
      setImportOmdbErrorResolver(null);
    }

    e.target.value = '';
  };

  // Handle user response to API error (OMDB/OpenLibrary) during import
  const handleImportOmdbErrorResponse = (continueImport, skipEnrichment) => {
    if (importOmdbErrorResolver && importOmdbErrorResolver.resolve) {
      importOmdbErrorResolver.resolve({ continue: continueImport, skipEnrichment });
      setImportOmdbError(null);
      setImportOmdbErrorResolver(null);
    }
  };

  // Handle batch operations
  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    setShowBatchDeleteConfirm(true);
  };

  const confirmBatchDelete = async () => {
    try {
      const selectedItems = getSelectedItems(filteredAndSortedItems);
      const totalItems = selectedItems.length;

      // Set up progress tracking
      setIsDeleting(true);
      setDeleteProgress(0);
      setDeleteTotal(totalItems);

      // Delete items one by one with progress tracking
      if (!storageAdapter || !storageAdapter.isConnected()) {
        throw new Error('Please connect to a storage location first');
      }

      let deletedCount = 0;
      const undoInfos = [];
      let lastProgressUpdate = 0;
      const progressThrottle = 5; // Update progress every 10 items

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        try {
          // Delete without reloading after each one
          const undoInfo = await storageAdapter.deleteItem(item);
          undoInfos.push(undoInfo);
          deletedCount++;

          // Throttle progress updates to reduce re-renders
          if (i - lastProgressUpdate >= progressThrottle || i === selectedItems.length - 1) {
            setDeleteProgress(i + 1);
            lastProgressUpdate = i;
          }
        } catch (error) {
          console.error('Error deleting item:', item.title, error);
        }
      }

      // Reload items only once at the end
      if (deletedCount > 0) {
        await loadItems();
        toast(`Deleted ${deletedCount} item${deletedCount !== 1 ? 's' : ''}`, { type: 'success' });
      }

      clearSelection();
      setShowBatchDeleteConfirm(false);
      setIsDeleting(false);
    } catch (error) {
      toast(error.message, { type: 'error' });
      setIsDeleting(false);
    }
  };

  const cancelBatchDelete = () => {
    setShowBatchDeleteConfirm(false);
  };

  const handleBatchEdit = async (changes) => {
    try {
      if (!storageAdapter || !storageAdapter.isConnected()) {
        throw new Error('Please connect to a storage location first');
      }

      // Convert Set to Array if needed
      const selectedIdsArray = Array.from(selectedIds);

      // Set up progress tracking
      setIsEditingBatch(true);
      setEditProgress(0);
      setEditTotal(selectedIdsArray.length);

      const updated = [];
      let lastProgressUpdate = 0;
      const progressThrottle = 10; // Update progress every 10 items

      for (let i = 0; i < selectedIdsArray.length; i++) {
        const id = selectedIdsArray[i];
        const item = items.find(it => it.id === id);
        if (!item) continue;

        const newItem = { ...item };

        // Apply only fields present in changes (non-empty)
        if (changes.type) newItem.type = changes.type;
        if (changes.author) newItem.author = changes.author;
        if (changes.director) newItem.director = changes.director;
        if (changes.year) newItem.year = changes.year;
        if (changes.rating !== null && changes.rating !== undefined) newItem.rating = changes.rating;
        if (changes.addTags && changes.addTags.length) {
          newItem.tags = Array.from(new Set([...(newItem.tags || []), ...changes.addTags]));
        }
        if (changes.removeTags && changes.removeTags.length) {
          newItem.tags = (newItem.tags || []).filter(t => !changes.removeTags.includes(t));
        }
        if (changes.dateRead) newItem.dateRead = changes.dateRead;
        if (changes.dateWatched) newItem.dateWatched = changes.dateWatched;
        if (changes.status) newItem.status = changes.status;

        try {
          await storageAdapter.saveItem(newItem);
          updated.push(newItem.id);

          // Throttle progress updates to reduce re-renders
          if (i - lastProgressUpdate >= progressThrottle || i === selectedIdsArray.length - 1) {
            setEditProgress(i + 1);
            lastProgressUpdate = i;
          }
        } catch (error) {
          console.error('Error updating item:', item.title, error);
        }
      }

      if (updated.length > 0) {
        await loadItems();
      }

      setShowBatchEdit(false);
      setIsEditingBatch(false);
      clearSelection();
      toast(`Updated ${updated.length} item${updated.length !== 1 ? 's' : ''}`, { type: 'success' });
    } catch (error) {
      toast(error.message, { type: 'error' });
      setIsEditingBatch(false);
    }
  };

  // Track storage indicator state
  const [storageIndicatorOpen, setStorageIndicatorOpen] = useState(false);

  // Update storage indicator state when it changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (storageIndicatorRef.current) {
        const isOpen = storageIndicatorRef.current.isOpen();
        setStorageIndicatorOpen(isOpen);
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, []);

  // Cleanup export submenu timeout on unmount
  useEffect(() => {
    return () => {
      if (exportSubmenuTimeoutRef.current) {
        clearTimeout(exportSubmenuTimeoutRef.current);
      }
    };
  }, []);

  // Handle window resize to recalculate submenu position
  useEffect(() => {
    const handleResize = () => {
      if (exportSubmenuOpen) {
        calculateExportSubmenuPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [exportSubmenuOpen]);

  // Add a useEffect to adjust menu positioning on mobile devices
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) { // Mobile breakpoint
        setDropdownStyle((prevStyle) => ({
          ...prevStyle,
          top: 'auto', // Ensure it doesn't overlap the search bar
          bottom: '10px', // Position above the bottom of the screen
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on mount

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll-to-top handler for header activation (click/tap)
  const handleHeaderActivate = (e) => {
    if (e) e.preventDefault();
    // If this was a touch interaction and user was scrolling, ignore
    if (e && e.type && e.type.startsWith('touch') && touchMovedRef.current) return;
    // If this was a touch interaction that started on a button, ignore
    if (e && e.type && e.type.startsWith('touch') && touchStartedOnButtonRef.current) return;

    // Don't scroll if the click/tap was on a button or interactive element (for non-touch events)
    if (e && e.target && !e.type.startsWith('touch')) {
      const target = e.target;
      // Check if the target or any of its parents is a button or has interactive behavior
      if (target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.getAttribute('role') === 'button' ||
        target.closest('[role="button"]')) {
        return;
      }
    }

    // Try multiple strategies for maximum compatibility
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { }
    try { document.documentElement && (document.documentElement.scrollTop = 0); } catch (_) { }
    try { document.body && (document.body.scrollTop = 0); } catch (_) { }
    const scrollingEl = document.scrollingElement;
    if (scrollingEl && typeof scrollingEl.scrollTo === 'function') {
      try { scrollingEl.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { }
    }
  };

  const handleHeaderTouchStart = (e) => {
    touchMovedRef.current = false;
    // Check if touch started on a button or interactive element
    const target = e.target;
    touchStartedOnButtonRef.current = target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.getAttribute('role') === 'button' ||
      target.closest('[role="button"]');
  };
  const handleHeaderTouchMove = () => { touchMovedRef.current = true; };

  // Track header height to offset content when header is fixed
  const [headerHeight, setHeaderHeight] = useState(72); // Initial estimate: 72px (typical header height)

  // Calculate header height after DOM is ready
  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        if (height > 0 && height !== headerHeight) {
          setHeaderHeight(height);
        }
      }
    };

    // Calculate immediately in layout effect
    updateHeaderHeight();

    // Use ResizeObserver for dynamic header height changes
    let resizeObserver;
    if (headerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateHeaderHeight);
      resizeObserver.observe(headerRef.current);
    }

    // Also update on window resize
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [headerHeight]);



  // Scroll to top when storage is selected (transitions from landing page to main app)
  useEffect(() => {
    if (!showStorageSelector) {
      // Try multiple strategies for maximum compatibility across desktop and mobile
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { }
      try { document.documentElement && (document.documentElement.scrollTop = 0); } catch (_) { }
      try { document.body && (document.body.scrollTop = 0); } catch (_) { }
      const scrollingEl = document.scrollingElement;
      if (scrollingEl && typeof scrollingEl.scrollTo === 'function') {
        try { scrollingEl.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { }
      }
    }
  }, [showStorageSelector]);

  // Keyboard navigation setup
  const { focusedIndex, focusedId, registerCardRef, isItemFocused, resetFocus } = useKeyboardNavigation({ // focusedId used directly for performance
    items: filteredAndSortedItems,
    cardSize,
    storageAdapter,
    onOpenHelp: () => {
      // Close other modals first
      setCustomizeOpen(false);
      if (storageIndicatorRef.current) {
        storageIndicatorRef.current.closeModal();
      }
      // Then toggle help
      setShowHelp(s => !s);
    },
    onFocusSearch: focusSearch,
    onAddItem: () => setIsAdding(true),
    onSearchOnline: () => setIsSearching(true),
    onToggleFilters: () => setShowFilters(s => !s),
    onToggleCustomize: () => {
      // Close other modals first
      setShowHelp(false);
      if (storageIndicatorRef.current) {
        storageIndicatorRef.current.closeModal();
      }
      // Then toggle customize
      setCustomizeOpen(s => !s);
    },
    onSwitchStorage: openStorageIndicator,
    onFilterAll: () => setFilterType('all'),
    onFilterBooks: () => setFilterType('book'),
    onFilterMovies: () => setFilterType('movie'),
    onToggleSelectionMode: toggleSelectionMode,
    onSelectAll: () => selectAll(filteredAndSortedItems),
    onDeleteSelected: handleDeleteSelected,
    onToggleItemSelection: toggleItemSelection,
    onOpenItem: setSelectedItem,
    onCloseModals: closeModals,
    onCloseBatchDeleteModal: () => setShowBatchDeleteConfirm(false),
    onConfirmBatchDelete: confirmBatchDelete,
    selectionMode,
    selectedCount,
    hasOpenModal: !!(selectedItem || isAdding || isSearching || showHelp || showBatchEdit || showBatchDeleteConfirm || showApiKeyManager || showTrash || customizeOpen || searchResultItem || storageIndicatorOpen),
    showHelp,
    customizeOpen,
    showBatchDeleteConfirm
  });

  // Initialize storage options on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const options = await getAvailableStorageOptions();
        setAvailableStorageOptions(options);

        // Check if user was previously connected to File System
        const wasFileSystemConnected = localStorage.getItem('fileSystemConnected');
        if (wasFileSystemConnected === 'true') {
          try {
            // Initialize the adapter
            const adapter = await initializeStorage('filesystem');

            // Try to reconnect (retrieve stored handle and verify permissions)
            console.log('Attempting to restore File System connection...');
            await adapter.tryReconnect();

            // If successful, load items
            await loadItems(adapter);
            setShowStorageSelector(false);
            console.log('Successfully reconnected to File System');
          } catch (error) {
            console.log('File System reconnection failed, user will need to select directory again:', error.message);
            // Don't show error toast - this is expected if permissions were revoked
            // User will see the storage selector and can reconnect manually
            localStorage.removeItem('fileSystemConnected');
            localStorage.removeItem('fileSystemDirectoryName');
          }
        }
        // Check if user was previously connected to Google Drive
        else {
          const wasGoogleDriveConnected = localStorage.getItem('googleDriveConnected');
          if (wasGoogleDriveConnected === 'true') {
            try {
              // Initialize the adapter
              const adapter = await initializeStorage('googledrive');

              // Try to reconnect silently (without showing popup)
              console.log('Attempting silent reconnection to Google Drive...');
              await adapter.tryReconnect();

              // If successful, load items
              await loadItems(adapter);
              setShowStorageSelector(false);
              console.log('Successfully reconnected to Google Drive');
            } catch (error) {
              console.log('Silent reconnection failed, user will need to sign in again:', error.message);
              // Don't show error toast - this is expected if the session expired
              // User will see the storage selector and can reconnect manually
              localStorage.removeItem('googleDriveConnected');
              localStorage.removeItem('googleDriveFolderId');
            }
          } else if (options.find(opt => opt.type === 'filesystem' && opt.supported)) {
            // If filesystem is supported but no previous connection, still show selector
            setShowStorageSelector(true);
          }
        }
      } catch (error) {
        setStorageError(error.message);
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle storage selection
  const handleStorageSelect = async (storageType) => {
    try {
      setStorageError(null);
      await selectStorage(storageType);
      setShowStorageSelector(false);
    } catch (error) {
      setStorageError(error.message);
    }
  };

  // Handle storage disconnection
  const handleDisconnectStorage = async () => {
    try {
      // Cancel any active import before disconnecting
      if (importAbortControllerRef.current) {
        console.log('[Storage] Cancelling active import before disconnecting storage');
        importAbortControllerRef.current.abort();
        importAbortControllerRef.current = null;
        // Give the import a moment to clean up
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await disconnectStorage();
      setShowStorageSelector(true);
      closeModals();

      // Scroll to storage selector after a brief delay to allow rendering
      setTimeout(() => {
        if (landingPageRef.current) {
          landingPageRef.current.scrollToStorage();
        }
      }, 100);
    } catch (error) {
      setStorageError(error.message);
    }
  };
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return;

      // If click is inside the menu button, ignore
      if (menuRef.current && menuRef.current.contains(e.target)) return;

      // If click is inside the portal menu, ignore
      let el = e.target;
      while (el) {
        if (el.getAttribute && el.getAttribute('data-menu-portal') === '1') return;
        el = el.parentElement;
      }

      setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Handle clicks outside filter panel to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilters &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target)) {
        // Check if click is inside the FilterModal
        let el = event.target;
        while (el) {
          if (el.getAttribute && el.getAttribute('data-filter-modal') === '1') return;
          el = el.parentElement;
        }
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters, setShowFilters]);

  // Compute portal menu position when opened
  useEffect(() => {
    if (!menuOpen || !menuRef.current) {
      setMenuPos(null);
      return;
    }
    const btnRect = menuRef.current.getBoundingClientRect();
    const width = 192; // w-48
    const left = Math.max(8, btnRect.right - width);
    const top = btnRect.bottom + 8;
    setMenuPos({ left, top, width });
  }, [menuOpen]);

  // Track when storage is connected to trigger effects properly
  const [isStorageConnected, setIsStorageConnected] = useState(false);

  // Update connection status when storage changes
  useEffect(() => {
    const connected = storageAdapter && storageAdapter.isConnected();
    setIsStorageConnected(connected);
  }, [storageAdapter, storageInfo]);

  // Auto-show API key modal when storage is connected and no API key is configured
  useEffect(() => {
    if (storageAdapter && isStorageConnected && !hasApiKey()) {
      // Small delay to ensure the storage connection UI has settled
      const timer = setTimeout(() => {
        setShowApiKeyManager(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [storageAdapter, isStorageConnected]);

  // Prompt to create Obsidian Base file when storage connects (only once per session)
  const basePromptedRef = useRef(false);
  const [showObsidianBaseModal, setShowObsidianBaseModal] = useState(false);

  useEffect(() => {
    if (!storageAdapter || !isStorageConnected || basePromptedRef.current) return;

    // Respect persistent 'don't ask again' preference
    const dontAskPersisted = localStorage.getItem('obsidianBaseDontAsk') === 'true';
    if (dontAskPersisted) {
      basePromptedRef.current = true;
      return;
    }

    // If the API key modal is currently open, defer until it closes
    if (showApiKeyManager) return;

    let cancelled = false;

    const checkAndPrompt = async () => {
      try {
        const exists = await storageAdapter.fileExists(OBSIDIAN_BASE_FILENAME);
        if (cancelled) return;
        if (exists) {
          basePromptedRef.current = true;
          return;
        }

        // Small delay to ensure the storage connection UI has settled
        const delay = 600;

        setTimeout(async () => {
          if (cancelled) return;

          // Double-check that API modal isn't open (could have opened during delay)
          if (showApiKeyManager) return;

          // Show the nicer modal prompt instead of a native confirm
          setShowObsidianBaseModal(true);
          basePromptedRef.current = true;
        }, delay);
      } catch (err) {
        console.error('Error checking for Obsidian Base file:', err);
        basePromptedRef.current = true;
      }
    };

    checkAndPrompt();

    return () => {
      cancelled = true;
    };
  }, [storageAdapter, isStorageConnected, showApiKeyManager]);

  // Handler invoked by the ObsidianBaseModal when user chooses to create (or cancels)
  const handleCreateObsidianBase = async (dontAsk = false) => {
    try {
      if (dontAsk) localStorage.setItem('obsidianBaseDontAsk', 'true');
      setShowObsidianBaseModal(false);
      if (!storageAdapter || !storageAdapter.isConnected()) {
        toast('Please connect to a storage location first', { type: 'error' });
        return;
      }

      const exists = await storageAdapter.fileExists(OBSIDIAN_BASE_FILENAME);
      if (exists) {
        toast(`Obsidian Base already exists: ${OBSIDIAN_BASE_FILENAME}`, { type: 'info' });
        return;
      }

      await storageAdapter.writeFile(OBSIDIAN_BASE_FILENAME, OBSIDIAN_BASE_CONTENT);
      toast(`Created ${OBSIDIAN_BASE_FILENAME} in your storage location.`, { type: 'success' });
    } catch (err) {
      console.error('Failed to create Obsidian Base file:', err);
      toast(`Failed to create Obsidian Base: ${err.message}`, { type: 'error' });
    }
  };

  return (
    <div
      id="app-top"
      className="min-h-screen text-white flex flex-col"
      style={{
        background: 'linear-gradient(135deg, var(--mt-primary), rgba(15,23,42,1))',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {!showStorageSelector && (
        <header
          ref={headerRef}
          onClick={handleHeaderActivate}
          onPointerUp={handleHeaderActivate}
          onTouchStart={handleHeaderTouchStart}
          onTouchMove={handleHeaderTouchMove}
          onTouchEnd={handleHeaderActivate}
          aria-label="Scroll to top"
          title="Scroll to top"
          className="fixed top-0 left-0 right-0 z-40 bg-slate-800/50 backdrop-blur border-b border-slate-700 cursor-pointer"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                <img src="./logo_white.svg" alt="logo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
                <span className="hidden xs:inline">Markdown Media Tracker</span>
                <span className="xs:hidden">MMT</span>
              </h1>
              <div className="flex gap-2">
                {!storageAdapter || !storageAdapter.isConnected() ? null : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsSearching(true); }}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsSearching(true); }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition min-h-[44px]"
                      style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
                      title="Search"
                    >
                      <Search className="w-4 h-4" />
                      <span className="hidden sm:inline">Add new media</span>
                    </button>

                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        aria-expanded={menuOpen}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition bg-slate-700/50 hover:bg-slate-700 min-h-[44px]"
                        title="More actions"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="hidden sm:inline">Menu</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Spacer to offset fixed header height */}
      {!showStorageSelector && (
        <div style={{ height: headerHeight }} />
      )}



      {menuOpen && menuPos && createPortal(
        <div data-menu-portal="1" style={{ position: 'fixed', left: `${menuPos.left}px`, top: `${menuPos.top}px`, width: `${menuPos.width}px`, zIndex: 99999 }}>
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-2 text-white">

            <button
              onClick={() => { setIsAdding(true); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Manually
            </button>

            <label className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-white">
              <input id="import-csv-input" type="file" accept=".csv,.zip,text/csv,application/zip" onChange={(e) => { handleImportFile(e); setMenuOpen(false); }} className="hidden" />
              <Upload className="w-4 h-4" />
              <div className="flex-1">
                <div>Import CSV/ZIP</div>
                {isImporting && (
                  <div className="mt-2">
                    <div className="text-xs text-slate-300">Imported {importAdded} / {importTotal}</div>
                    <div className="w-full bg-slate-700 rounded h-2 mt-1 overflow-hidden">
                      <div className="bg-blue-500 h-2 transition-all" style={{ width: importTotal > 0 ? `${Math.round((importProcessed / importTotal) * 100)}%` : '0%' }} />
                    </div>
                  </div>
                )}
              </div>
            </label>

            <div
              ref={exportContainerRef}
              className="relative"
              onMouseEnter={handleExportSubmenuEnter}
              onMouseLeave={handleExportSubmenuLeave}
            >
              <button
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-white justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {exportSubmenuOpen && (
                <div className={`absolute top-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 text-white min-w-[160px] max-w-[200px] z-50 animate-in duration-150 ${exportSubmenuPosition === 'left'
                  ? 'right-full mr-2 slide-in-from-right-2'
                  : 'left-full ml-2 slide-in-from-left-2'
                  }`}>
                  <button
                    onClick={() => { exportAllItems(items); setMenuOpen(false); setExportSubmenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2 text-white text-sm transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Export All
                  </button>
                  <button
                    onClick={() => { exportBooks(items); setMenuOpen(false); setExportSubmenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2 text-white text-sm transition-colors"
                  >
                    <Book className="w-3 h-3" />
                    Export Books
                  </button>
                  <button
                    onClick={() => { exportMovies(items); setMenuOpen(false); setExportSubmenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2 text-white text-sm transition-colors"
                  >
                    <Film className="w-3 h-3" />
                    Export Movies
                  </button>
                </div>
              )}
            </div>

            <div
              ref={settingsContainerRef}
              className="relative"
              onMouseEnter={handleSettingsSubmenuEnter}
              onMouseLeave={handleSettingsSubmenuLeave}
            >
              <button
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-white justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {settingsSubmenuOpen && (
                <div className={`absolute top-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 text-white min-w-[180px] max-w-[220px] z-50 animate-in duration-150 ${settingsSubmenuPosition === 'left'
                  ? 'right-full mr-2 slide-in-from-right-2'
                  : 'left-full ml-2 slide-in-from-left-2'
                  }`}>
                  <button
                    onClick={() => { setShowApiKeyManager(true); setMenuOpen(false); setSettingsSubmenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2 text-white text-sm transition-colors"
                  >
                    <Key className="w-3 h-3" />
                    API Keys
                  </button>
                  {storageAdapter?.getStorageType() === 'googledrive' && (
                    <button
                      onClick={handleClearCache}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2 text-white text-sm transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Cache
                    </button>
                  )}
                  <div className="w-full px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2 text-white text-sm transition-colors">
                    <label className="flex items-center justify-between cursor-pointer w-full">
                      <span>
                        <span className="text-sm font-medium">Half Star Ratings</span>
                      </span>
                      <button
                        onClick={() => setHalfStarsEnabled(!halfStarsEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${halfStarsEnabled ? 'bg-blue-600' : 'bg-slate-600'}`}
                        tabIndex={0}
                        aria-label="Toggle half star ratings"
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${halfStarsEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Undo Delete option intentionally removed from the menu */}

            <button
              onClick={() => { setShowTrash(true); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-white"
            >
              <Trash2 className="w-4 h-4" />
              View Trash
            </button>

            <button
              onClick={() => { handleDisconnectStorage(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Switch Storage
            </button>

          </div>
        </div>,
        document.body
      )}

      {/* Floating import progress (bottom-left) */}
      {isImporting && !importOmdbError && (
        <div className="fixed left-4 bottom-4 z-50">
          <div className="w-80 bg-slate-800/80 border border-slate-700 rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                <div className="text-sm font-semibold">Importing File</div>
              </div>
              <div className="text-sm text-slate-300">{importAdded} / {importTotal}</div>
            </div>
            <div className="w-full bg-slate-700 rounded h-3 overflow-hidden">
              <div className="bg-blue-500 h-3 transition-all" style={{ width: importTotal > 0 ? `${Math.round((importProcessed / importTotal) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>
      )}

      {/* OMDB Error Modal during import */}
      {importOmdbError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {importOmdbError.name === 'OpenLibraryError' ? 'Open Library Issue Detected' : 'OMDb API Issue Detected'}
                </h3>
                <p className="text-sm text-slate-300 mb-1">
                  {importOmdbError.message}
                </p>
                {importOmdbError.type === 'QUOTA_EXCEEDED' && (
                  <p className="text-xs text-slate-400 mt-2">
                    Your daily API limit has been reached. Movies will be imported with basic information from the CSV file only.
                  </p>
                )}
                {importOmdbError.type === 'AUTH_FAILED' && (
                  <p className="text-xs text-slate-400 mt-2">
                    There's an issue with your API key. Movies will be imported with basic information from the CSV file only.
                  </p>
                )}
                {importOmdbError.type === 'NETWORK' && (
                  <p className="text-xs text-slate-400 mt-2">
                    {importOmdbError.name === 'OpenLibraryError'
                      ? 'Books will be imported with information from the CSV file only.'
                      : 'Movies will be imported with basic information from the CSV file only.'}
                  </p>
                )}
                {importOmdbError.type === 'SERVICE_DOWN' && (
                  <p className="text-xs text-slate-400 mt-2">
                    Books will be imported with information from the CSV file only.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
              {importCurrentFile && (
                <div className="mb-3 pb-2 border-b border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">Current file:</p>
                  <p className="text-sm text-blue-400 font-mono">{importCurrentFile}</p>
                </div>
              )}
              <p className="text-xs text-slate-400 mb-2">Import progress:</p>
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-200">{importAdded} / {importTotal} items</div>
                <div className="flex-1 bg-slate-700 rounded h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 transition-all" style={{ width: importTotal > 0 ? `${Math.round((importProcessed / importTotal) * 100)}%` : '0%' }} />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleImportOmdbErrorResponse(false, false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel Import
              </button>
              <button
                onClick={() => handleImportOmdbErrorResponse(true, true)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                Continue Without {importOmdbError.name === 'OpenLibraryError' ? 'Enrichment' : 'OMDb'}
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-3">
              Continuing will import remaining {importOmdbError.name === 'OpenLibraryError' ? 'books' : 'movies'} using only CSV data
            </p>
          </div>
        </div>
      )}

      {showStorageSelector ? (
        <div className="flex-1">
          <LandingPage
            ref={landingPageRef}
            onStorageSelect={handleStorageSelect}
            availableOptions={availableStorageOptions}
            error={storageError}
            isLoading={isLoading}
            loadProgress={loadProgress}
          />
        </div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto px-4 py-4 sm:py-6">
          {/* Search and Type Filters */}
          <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <input
                type="text"
                placeholder="Search your library by title, author, director..."
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.target.blur();
                    setSearchTerm('');
                  }
                }}
                className="w-full pl-10 pr-10 py-3 sm:py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              />
            </div>
            <div className="flex gap-2 justify-center sm:justify-start">
              {['all', 'book', 'movie'].map(type => {
                const getTypeIcon = (type) => {
                  switch (type) {
                    case 'book':
                      return <Book className="w-5 h-5" />;
                    case 'movie':
                      return <Film className="w-5 h-5" />;
                    case 'all':
                      return <span className="text-sm font-medium">All</span>;
                    default:
                      return null;
                  }
                };

                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-lg transition min-h-[44px] flex items-center justify-center ${filterType === type
                      ? ''
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    style={filterType === type ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                    title={type === 'all' ? 'All items' : type === 'book' ? 'Books only' : 'Movies only'}
                  >
                    {getTypeIcon(type)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort, Selection, and Filter Controls */}
          <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            {/* Mobile: First row - Sort controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="text-sm text-slate-300 flex items-center gap-2 flex-shrink-0">
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">Sort:</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none text-sm min-h-[44px]"
              >
                <option value="dateConsumed">Date Read/Watched</option>
                <option value="dateAdded">Date Added</option>
                <option value="status">Status</option>
                <option value="title">Title</option>
                <option value="author">Author / Director</option>
                <option value="year">Year</option>
                <option value="rating">Rating</option>
              </select>

              <button
                onClick={toggleSortOrder}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg transition min-h-[44px]"
                title="Toggle sort order"
              >
                {sortOrder === 'asc' ? (
                  <div className="flex items-center gap-1 text-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8l-4 6h8l-4-6z" fill="currentColor" />
                    </svg>
                    <span className="hidden sm:inline">Asc</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16l4-6H8l4 6z" fill="currentColor" />
                    </svg>
                    <span className="hidden sm:inline">Desc</span>
                  </div>
                )}
              </button>
            </div>

            {/* Mobile: Second row - Action controls */}
            <div className="flex items-center gap-2 sm:ml-auto">
              {selectionMode && (
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <span className="text-sm text-slate-400 flex-shrink-0">
                    {selectedCount} selected
                  </span>
                  {selectedCount > 0 && (
                    <>
                      <button
                        onClick={() => setShowBatchEdit(true)}
                        className="p-2 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
                        title="Batch Edit"
                      >
                        <SlidersHorizontal className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        className="p-2 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,0,0,0.16)', color: 'white' }}
                        title="Delete Selected"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition min-h-[44px] ${selectionMode ? '' : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                style={selectionMode ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
                title="Toggle selection mode"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">{selectionMode ? 'Selecting' : 'Select'}</span>
              </button>

              <button
                ref={filterButtonRef}
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 sm:px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition flex items-center gap-2 min-h-[44px]"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Filter Modal - Full width below controls */}
          <FilterModal
            showFilters={showFilters}
            filterRating={filterRating}
            filterMaxRating={filterMaxRating}
            filterHasReview={filterHasReview}
            filterHasCover={filterHasCover}
            filterTags={filterTags}
            filterStatuses={filterStatuses}
            filterRecent={filterRecent}
            filterStartDate={filterStartDate}
            filterEndDate={filterEndDate}
            allTags={allTags}
            allStatuses={allStatuses}
            setFilterRating={setFilterRating}
            setFilterMaxRating={setFilterMaxRating}
            setFilterHasReview={setFilterHasReview}
            setFilterHasCover={setFilterHasCover}
            setFilterRecent={setFilterRecent}
            setFilterStartDate={setFilterStartDate}
            setFilterEndDate={setFilterEndDate}
            toggleTagFilter={toggleTagFilter}
            toggleStatusFilter={toggleStatusFilter}
            clearFilters={clearFilters}
          />

          {/* Items Grid */}
          <div className="mb-6">
            {filteredAndSortedItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
                  {hasActiveFilters ? (
                    <Search className="w-16 h-16 text-slate-600" />
                  ) : (
                    <Book className="w-16 h-16 text-slate-600" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-300">
                  {hasActiveFilters ? 'No matches found' : 'No items yet'}
                </h3>
                <p className="text-slate-400 mb-6">
                  {hasActiveFilters
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Add some books or movies to get started.'
                  }
                </p>
                {!hasActiveFilters && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="px-6 py-3 rounded-lg transition"
                    style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add First Item
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full min-h-0">
                <div style={{ gridAutoRows: '1fr' }} className={`grid gap-3 sm:gap-4 w-full ${cardSize === 'tiny' ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10' :
                  // Small is now a denser middle-ground between tiny and medium
                  cardSize === 'small' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' :
                    cardSize === 'large' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
                      cardSize === 'xlarge' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' :
                        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                  }`}>
                  {filteredAndSortedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      cardSize={cardSize}
                      highlightColor={highlightColor}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      focusedId={focusedId}
                      onItemClick={handleItemClick}
                      registerCardRef={registerCardRef}
                      halfStarsEnabled={halfStarsEnabled}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customize Panel */}
      {customizeOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Customize Appearance</h2>
              <button onClick={() => setCustomizeOpen(false)} className="p-1 hover:bg-slate-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Card Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Card Size: {cardSize.charAt(0).toUpperCase() + cardSize.slice(1)}
                </label>
                <div className="px-3">
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={['tiny', 'small', 'medium', 'large', 'xlarge'].indexOf(cardSize)}
                    onChange={(e) => {
                      const sizes = ['tiny', 'small', 'medium', 'large', 'xlarge'];
                      updateCardSize(sizes[parseInt(e.target.value)]);
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, var(--mt-highlight) 0%, var(--mt-highlight) ${(['tiny', 'small', 'medium', 'large', 'xlarge'].indexOf(cardSize) / 4) * 100}%, #475569 ${(['tiny', 'small', 'medium', 'large', 'xlarge'].indexOf(cardSize) / 4) * 100}%, #475569 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Tiny</span>
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                    <span>X-Large</span>
                  </div>
                </div>
              </div>

              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Primary Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Primary Color Presets */}
                  {PRIMARY_COLOR_PRESETS.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => updatePrimaryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${primaryColor === color ? 'border-white shadow-lg' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      style={{ backgroundColor: color }}
                      title={`Primary preset ${index + 1}`}
                    />
                  ))}
                  {/* Primary Color Picker */}
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => updatePrimaryColor(e.target.value)}
                    className="w-12 h-8 rounded border border-slate-600 hover:border-slate-400 cursor-pointer bg-transparent"
                    title="Custom primary color"
                  />
                </div>
              </div>

              {/* Highlight Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Highlight Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Highlight Color Presets */}
                  {HIGHLIGHT_COLOR_PRESETS.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => updateHighlightColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${highlightColor === color ? 'border-white shadow-lg' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      style={{ backgroundColor: color }}
                      title={`Highlight preset ${index + 1}`}
                    />
                  ))}
                  {/* Highlight Color Picker */}
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => updateHighlightColor(e.target.value)}
                    className="w-12 h-8 rounded border border-slate-600 hover:border-slate-400 cursor-pointer bg-transparent"
                    title="Custom highlight color"
                  />
                </div>
              </div>

              {/* Half Stars Setting */}
              {/* Removed half-star toggle from customize panel */}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isSearching && (
        <SearchModal
          onClose={() => setIsSearching(false)}
          onSelect={(result) => {
            setSearchResultItem(result);
            setIsSearching(false);
            setIsAdding(true);
          }}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {showApiKeyManager && <ApiKeyModal onClose={() => setShowApiKeyManager(false)} />}
      
      {showTrash && (
        <TrashModal
          storageAdapter={storageAdapter}
          onClose={() => setShowTrash(false)}
          onRestore={() => loadItems()}
        />
      )}
      
      {showObsidianBaseModal && (
        <ObsidianBaseModal
          onClose={() => setShowObsidianBaseModal(false)}
          onCreate={handleCreateObsidianBase}
        />
      )}

      {showBatchEdit && (
        <BatchEditModal
          onClose={() => setShowBatchEdit(false)}
          onApply={handleBatchEdit}
          selectedItems={getSelectedItems(filteredAndSortedItems)}
          isProcessing={isEditingBatch}
          progress={editProgress}
          total={editTotal}
        />
      )}

      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Delete Items</h3>

            {!isDeleting ? (
              <>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelBatchDelete}
                    className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBatchDelete}
                    className="px-4 py-2 rounded transition text-sm text-white"
                    style={{ backgroundColor: 'rgba(255,0,0,0.8)' }}
                  >
                    Delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-300 mb-4">
                  Deleting {deleteProgress} of {deleteTotal} items...
                </p>
                <div className="w-full bg-slate-700 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-red-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(deleteProgress / deleteTotal) * 100}%` }}
                  ></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={(item) => {
            saveItem(item);
            setSelectedItem(null);
          }}
          onQuickSave={(item) => {
            // persist change but keep modal open
            saveItem(item);
          }}
          onDelete={(item) => {
            deleteItem(item);
            setSelectedItem(null);
          }}
          hexToRgba={hexToRgba}
          highlightColor={highlightColor}
          items={filteredAndSortedItems}
          onNavigate={setSelectedItem}
          allTags={allTags}
        />
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-40">
        {/* Storage Indicator */}
        {!showStorageSelector && (
          <StorageIndicator
            ref={storageIndicatorRef}
            storageAdapter={storageAdapter}
            storageInfo={storageInfo}
            onSwitchStorage={handleDisconnectStorage}
            onRefresh={() => loadItems()}
          />
        )}

        {/* Customize Button */}
        <button
          onClick={() => {
            // Close other modals first
            setShowHelp(false);
            if (storageIndicatorRef.current) {
              storageIndicatorRef.current.closeModal();
            }
            // Then toggle customize
            setCustomizeOpen(prev => !prev);
          }}
          className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
          style={{ backgroundColor: 'var(--mt-highlight)' }}
          title="Customize Appearance"
        >
          <Palette className="w-5 h-5 text-white" />
        </button>

        {/* Help Button */}
        <button
          onClick={() => {
            // Close other modals first
            setCustomizeOpen(false);
            if (storageIndicatorRef.current) {
              storageIndicatorRef.current.closeModal();
            }
            // Then toggle help
            setShowHelp(prev => !prev);
          }}
          className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
          title="Help & Shortcuts"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {isAdding && (
        <AddEditModal
          onClose={() => {
            setIsAdding(false);
            setSearchResultItem(null);
          }}
          onSave={(item) => {
            saveItem(item);
            setIsAdding(false);
            setSearchResultItem(null);
          }}
          initialItem={searchResultItem}
          allTags={allTags}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <a
              href="https://github.com/samsledje/markdown-media-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <span className="text-slate-500">|</span>
            <a
              href="./privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
              title="Privacy Policy"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
              </svg>
            </a>
            <span className="text-slate-500">|</span>
            <a
              href="https://samsl.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
              title="Visit samsl.io"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MediaTracker;
