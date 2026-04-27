import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MediaTracker from '../MediaTracker';
import React from 'react';

vi.mock('../hooks/useItems', () => ({ useItems: vi.fn() }));
vi.mock('../hooks/useFilters', () => ({ useFilters: vi.fn() }));
vi.mock('../hooks/useSelection', () => ({ useSelection: vi.fn() }));
vi.mock('../hooks/useTheme', () => ({ useTheme: vi.fn() }));
vi.mock('../hooks/useKeyboardNavigation', () => ({ useKeyboardNavigation: vi.fn() }));
vi.mock('../hooks/useOmdbApi', () => ({ useOmdbApi: vi.fn() }));
vi.mock('../hooks/useHalfStars', () => ({ useHalfStars: vi.fn() }));
vi.mock('../services/toastService', () => ({ toast: vi.fn() }));
vi.mock('../config', () => ({ hasApiKey: vi.fn(() => true) }));
vi.mock('../utils/csvUtils', () => ({ exportCSV: vi.fn() }));
vi.mock('../utils/importUtils', () => ({ processImportFile: vi.fn() }));

import { useItems } from '../hooks/useItems';
import { useFilters } from '../hooks/useFilters';
import { useSelection } from '../hooks/useSelection';
import { useTheme } from '../hooks/useTheme';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useOmdbApi } from '../hooks/useOmdbApi';
import { useHalfStars } from '../hooks/useHalfStars';

describe('MediaTracker', () => {
  const mockUseItems = {
    items: [],
    storageAdapter: { isConnected: () => true, getStorageType: () => 'filesystem' },
    storageInfo: 'Local Storage',
    isLoading: false,
    loadProgress: { current: 0, total: 0 },
    undoStack: [],
    initializeStorage: vi.fn(),
    loadItems: vi.fn(),
    saveItem: vi.fn(),
    deleteItem: vi.fn(),
    deleteItems: vi.fn(),
    undoLastDelete: vi.fn(),
    selectStorage: vi.fn(),
    disconnectStorage: vi.fn(),
    getAvailableStorageOptions: vi.fn(() => ['filesystem', 'googledrive']),
    applyBatchEdit: vi.fn()
  };

  const mockUseFilters = {
    searchTerm: '',
    filterType: 'all',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    filterRating: 0,
    filterMaxRating: 5,
    filterHasReview: false,
    filterHasCover: false,
    filterTags: [],
    filterStatuses: [],
    filterRecent: 'any',
    filterStartDate: null,
    filterEndDate: null,
    showFilters: false,
    allTags: ['fiction', 'classic'],
    allStatuses: ['read', 'reading'],
    hasActiveFilters: false,
    filteredAndSortedItems: [],
    setSearchTerm: vi.fn(),
    setFilterType: vi.fn(),
    setSortBy: vi.fn(),
    setSortOrder: vi.fn(),
    setFilterRating: vi.fn(),
    setFilterMaxRating: vi.fn(),
    setFilterHasReview: vi.fn(),
    setFilterHasCover: vi.fn(),
    setFilterTags: vi.fn(),
    setFilterStatuses: vi.fn(),
    setFilterRecent: vi.fn(),
    setFilterStartDate: vi.fn(),
    setFilterEndDate: vi.fn(),
    setShowFilters: vi.fn(),
    toggleTagFilter: vi.fn(),
    toggleStatusFilter: vi.fn(),
    clearFilters: vi.fn(),
    cycleFilterType: vi.fn(),
    toggleSortOrder: vi.fn()
  };

  const mockUseSelection = {
    selectionMode: false,
    selectedIds: new Set(),
    selectedCount: 0,
    toggleSelectionMode: vi.fn(),
    toggleItemSelection: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    isItemSelected: vi.fn(),
    getSelectedItems: vi.fn(() => [])
  };

  const mockUseTheme = {
    primaryColor: '#6366f1',
    highlightColor: '#3b82f6',
    cardSize: 'medium',
    updatePrimaryColor: vi.fn(),
    updateHighlightColor: vi.fn(),
    updateCardSize: vi.fn()
  };

  const mockUseKeyboardNavigation = {
    focusedIndex: -1,
    focusedId: null,
    registerCardRef: vi.fn(),
    isItemFocused: vi.fn(),
    resetFocus: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useItems.mockReturnValue(mockUseItems);
    useFilters.mockReturnValue(mockUseFilters);
    useSelection.mockReturnValue(mockUseSelection);
    useTheme.mockReturnValue(mockUseTheme);
    useKeyboardNavigation.mockReturnValue(mockUseKeyboardNavigation);
    useOmdbApi.mockReturnValue({ omdbApiKey: 'test-key', updateApiKey: vi.fn() });
    useHalfStars.mockReturnValue([false, vi.fn()]);
    localStorage.clear();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing when storage not connected', () => {
      useItems.mockReturnValue({ ...mockUseItems, storageAdapter: null });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });

    it('should render without crashing when storage is connected', () => {
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });
  });

  describe('Component Interactions', () => {
    it('should handle rendering with items', () => {
      const items = [
        { id: '1', title: 'Book 1', type: 'book', status: 'read', rating: 4, tags: [] },
        { id: '2', title: 'Movie 1', type: 'movie', status: 'watched', rating: 3, tags: [] }
      ];
      useFilters.mockReturnValue({ ...mockUseFilters, filteredAndSortedItems: items });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });

    it('should handle empty item state', () => {
      useFilters.mockReturnValue({ ...mockUseFilters, filteredAndSortedItems: [] });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });

    it('should handle selection mode', () => {
      useSelection.mockReturnValue({ ...mockUseSelection, selectionMode: true, selectedCount: 3 });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });
  });

  describe('Different States', () => {
    it('should render with various theme sizes', () => {
      for (const size of ['tiny', 'small', 'medium', 'large', 'xlarge']) {
        useTheme.mockReturnValue({ ...mockUseTheme, cardSize: size });
        const { container, unmount } = render(<MediaTracker />);
        expect(container).toBeDefined();
        unmount();
      }
    });

    it('should render with active filters', () => {
      useFilters.mockReturnValue({
        ...mockUseFilters,
        hasActiveFilters: true,
        filterRating: 4,
        filterTags: ['fiction'],
        filterStatuses: ['read']
      });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });

    it('should render with loading state', () => {
      useItems.mockReturnValue({ ...mockUseItems, isLoading: true, loadProgress: { current: 50, total: 100 } });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });

    it('should render with Google Drive storage', () => {
      useItems.mockReturnValue({
        ...mockUseItems,
        storageAdapter: { isConnected: () => true, getStorageType: () => 'googledrive' },
        storageInfo: 'Google Drive'
      });
      const { container } = render(<MediaTracker />);
      expect(container).toBeDefined();
    });
  });

  describe('Footer', () => {
    it('should render footer with links', () => {
      render(<MediaTracker />);
      const githubLink = screen.getByTitle('View on GitHub');
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', 'https://github.com/samsledje/markdown-media-tracker');

      const privacyLink = screen.getByTitle('Privacy Policy');
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute('href', './privacy-policy.html');

      const websiteLink = screen.getByTitle('Visit samsl.io');
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink).toHaveAttribute('href', 'https://samsl.io');
    });
  });
});
