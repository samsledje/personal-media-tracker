/**
 * Integration tests for Item Management workflows
 * Tests complete user flows: add → edit → delete → undo
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import MediaTracker from '../../MediaTracker.jsx';
import { useItems } from '../../hooks/useItems.js';
import * as openLibraryService from '../../services/openLibraryService.js';
import * as omdbService from '../../services/omdbService.js';

// Set longer timeout for integration tests (15 seconds)
vi.setConfig({ testTimeout: 15000 });

// Mock services
vi.mock('../../services/openLibraryService.js');
vi.mock('../../services/omdbService.js');
vi.mock('../../services/toastService.js', () => ({
  toast: vi.fn()
}));

// Mock storage adapter
const mockStorage = {
  isConnected: vi.fn(() => true),
  initialize: vi.fn(),
  getStorageType: vi.fn(() => 'filesystem'),
  getStorageInfo: vi.fn(() => ({ account: null, folder: 'Test Directory' })),
  selectStorage: vi.fn(() => Promise.resolve({ name: 'Test Directory' })),
  loadItems: vi.fn((progressCallback) => {
    if (progressCallback) {
      progressCallback({ processed: 0, total: 0, items: [] });
    }
    return Promise.resolve([]);
  }),
  saveItem: vi.fn((item) => Promise.resolve()),
  deleteItem: vi.fn((item) => Promise.resolve({ id: item.id, filename: `${item.id}.md` })),
  restoreItem: vi.fn((undoInfo) => Promise.resolve()),
  disconnect: vi.fn(() => Promise.resolve()),
  writeFile: vi.fn(),
  fileExists: vi.fn(() => Promise.resolve(false)),
  readFile: vi.fn()
};

vi.mock('../../services/storageAdapter.js', () => ({
  StorageFactory: {
    createAdapter: vi.fn(() => Promise.resolve(mockStorage)),
    getAvailableAdapters: vi.fn(() => Promise.resolve([
      {
        type: 'filesystem',
        name: 'Local Files',
        description: 'Store files locally on your device',
        supported: true,
        icon: 'FolderOpen'
      },
      {
        type: 'googledrive',
        name: 'Google Drive',
        description: 'Store files in your Google Drive',
        supported: true,
        icon: 'Cloud'
      }
    ]))
  }
}));

describe('Item Management Integration Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset mock storage state
    mockStorage.loadItems.mockImplementation((progressCallback) => {
      if (progressCallback) {
        progressCallback({ processed: 0, total: 0, items: [] });
      }
      return Promise.resolve([]);
    });
  });

  // Helper function to set up storage and open Add Manually modal
  const setupAndOpenAddModal = async () => {
    // Wait for storage selector and select filesystem
    const filesystemButton = await screen.findByRole('button', { name: /local files/i }, { timeout: 3000 });
    await user.click(filesystemButton);

    // Wait for main UI to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    // Open the menu
    const menuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(menuButton);

    // Wait for menu portal to appear
    await waitFor(() => {
      expect(document.querySelector('[data-menu-portal="1"]')).toBeInTheDocument();
    });

    // Click "Add Manually" in the menu
    const addManuallyButton = await screen.findByText(/add manually/i);
    await user.click(addManuallyButton);

    // Wait for Add/Edit modal
    await waitFor(() => {
      expect(screen.getByText(/add new item/i)).toBeInTheDocument();
    });
  };

  // Helper function to fill common book fields
  const fillBookFields = async (data) => {
    const titleInput = screen.getByPlaceholderText(/enter title/i);
    await user.click(titleInput);
    await user.clear(titleInput);
    await user.paste(data.title);

    if (data.author) {
      const authorInput = screen.getByPlaceholderText(/enter author/i);
      await user.click(authorInput);
      await user.clear(authorInput);
      await user.paste(data.author);
    }

    if (data.year) {
      const yearInput = screen.getByPlaceholderText(/enter year/i);
      await user.click(yearInput);
      await user.clear(yearInput);
      await user.paste(data.year);
    }

    if (data.status) {
      const statusButton = screen.getByRole('button', { name: new RegExp(`^${data.status}$`, 'i') });
      await user.click(statusButton);
    }

    if (data.rating) {
      const starButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') && btn.querySelector('svg').classList.contains('w-8')
      );
      await user.click(starButtons[data.rating - 1]);
    }
  };

  // Helper function to fill common movie fields
  const fillMovieFields = async (data) => {
    const titleInput = screen.getByPlaceholderText(/enter title/i);
    await user.click(titleInput);
    await user.clear(titleInput);
    await user.paste(data.title);

    if (data.director) {
      const directorInput = screen.getByPlaceholderText(/enter director/i);
      await user.click(directorInput);
      await user.clear(directorInput);
      await user.paste(data.director);
    }

    if (data.year) {
      const yearInput = screen.getByPlaceholderText(/enter year/i);
      await user.click(yearInput);
      await user.clear(yearInput);
      await user.paste(data.year);
    }

    if (data.status) {
      const statusButton = screen.getByRole('button', { name: new RegExp(`^${data.status}$`, 'i') });
      await user.click(statusButton);
    }

    if (data.rating) {
      const starButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') && btn.querySelector('svg').classList.contains('w-8')
      );
      await user.click(starButtons[data.rating - 1]);
    }
  };

  describe('Manual Item Addition Flow', () => {
    it('should add a book manually through complete workflow', async () => {
      render(<MediaTracker />);

      // Wait for storage selector and select filesystem
      const filesystemButton = await screen.findByRole('button', { name: /local files/i }, { timeout: 5000 });
      await user.click(filesystemButton);

      // Wait for main UI to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Open the menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(menuButton);

      // Wait for menu portal to appear
      await waitFor(() => {
        expect(document.querySelector('[data-menu-portal="1"]')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click "Add Manually" in the menu
      const addManuallyButton = await screen.findByText(/add manually/i, {}, { timeout: 5000 });
      await user.click(addManuallyButton);

      // Wait for Add/Edit modal
      await waitFor(() => {
        expect(screen.getByText(/add new item/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Select "Book" type by clicking the button
      const bookButton = screen.getByRole('button', { name: /^book$/i });
      await user.click(bookButton);

      // Fill in book details using placeholders
      const titleInput = screen.getByPlaceholderText(/enter title/i);
      await user.click(titleInput);
      await user.clear(titleInput);
      await user.paste('The Great Gatsby');

      const authorInput = screen.getByPlaceholderText(/enter author/i);
      await user.click(authorInput);
      await user.clear(authorInput);
      await user.paste('F. Scott Fitzgerald');

      // Set year
      const yearInput = screen.getByPlaceholderText(/enter year/i);
      await user.click(yearInput);
      await user.clear(yearInput);
      await user.paste('1925');

      // Set status by clicking the button
      const readButton = screen.getByRole('button', { name: /^read$/i });
      await user.click(readButton);

      // Set rating by clicking the 5th star
      const starButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') && btn.querySelector('svg').classList.contains('w-8')
      );
      await user.click(starButtons[4]); // 5th star (0-indexed)

      // Add tags
      const tagsInput = screen.getByPlaceholderText(/add tag/i);
      await user.click(tagsInput);
      await user.paste('classic');
      await waitFor(() => {
        expect(tagsInput).toHaveValue('classic');
      }, { timeout: 5000 });
      await user.keyboard('{Enter}');
      // Wait for the first tag to appear
      await waitFor(() => {
        const tags = screen.getAllByText('classic', { exact: false });
        expect(tags.some(tag => tag.tagName === 'SPAN')).toBe(true);
      }, { timeout: 5000 });
      await user.paste('fiction');
      await waitFor(() => {
        expect(tagsInput).toHaveValue('fiction');
      }, { timeout: 5000 });
      await user.keyboard('{Enter}');
      // Wait for the second tag to appear
      await waitFor(() => {
        const tags = screen.getAllByText('fiction', { exact: false });
        expect(tags.some(tag => tag.tagName === 'SPAN')).toBe(true);
      }, { timeout: 5000 });

      // Add notes
      const notesInput = screen.getByPlaceholderText(/write your review/i);
      await user.click(notesInput);
      await user.paste('A masterpiece of American literature');

      // Save the item
      const saveButton = screen.getByRole('button', { name: /save item/i });
      await user.click(saveButton);

      // Verify saveItem was called with correct data
      await waitFor(() => {
        expect(mockStorage.saveItem).toHaveBeenCalled();
      }, { timeout: 5000 });

      const savedItem = mockStorage.saveItem.mock.calls[0][0];
      expect(savedItem).toMatchObject({
        title: 'The Great Gatsby',
        type: 'book',
        author: 'F. Scott Fitzgerald',
        year: '1925',
        status: 'read',
        rating: 5,
        tags: ['classic', 'fiction'],
        review: 'A masterpiece of American literature'
      });
      expect(savedItem.dateAdded).toBeDefined();

      // Verify modal closed
      await waitFor(() => {
        expect(screen.queryByText(/add new item/i)).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should add a movie manually through complete workflow', async () => {
      render(<MediaTracker />);

      await setupAndOpenAddModal();

      // Select "Movie" type
      const movieButton = screen.getByRole('button', { name: /^movie$/i });
      await user.click(movieButton);

      // Fill in movie details using helper
      await fillMovieFields({
        title: 'Inception',
        director: 'Christopher Nolan',
        year: '2010',
        status: 'watched',
        rating: 4
      });

      // Save
      const saveButton = screen.getByRole('button', { name: /save item/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockStorage.saveItem).toHaveBeenCalled();
      });

      const savedItem = mockStorage.saveItem.mock.calls[0][0];
      expect(savedItem).toMatchObject({
        title: 'Inception',
        type: 'movie',
        director: 'Christopher Nolan',
        year: '2010',
        status: 'watched',
        rating: 4
      });
    });
  });

  describe('Online Search and Add Flow', () => {
    it('should search for and add a book from Open Library', async () => {
      // Mock Open Library response - searchBooks returns an array directly
      openLibraryService.searchBooks.mockResolvedValue([
        {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          year: 1960,
          coverUrl: 'https://example.com/cover.jpg',
          isbn: '0061120084',
          type: 'book'
        }
      ]);

      render(<MediaTracker />);

      // Setup storage
      const filesystemButton = await screen.findByRole('button', { name: /local files/i }, { timeout: 3000 });
      await user.click(filesystemButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Open search modal - click "Add new media" button
      const searchButton = screen.getByRole('button', { name: /add new media|search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/search books.*movies/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Books tab should be selected by default, so we can just search

      // Search for a book
      const searchInput = screen.getByPlaceholderText(/search for books/i);
      await user.click(searchInput);
      await user.paste('To Kill a Mockingbird');

      const searchSubmitButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchSubmitButton);

      // Wait for results with longer timeout
      await waitFor(() => {
        expect(openLibraryService.searchBooks).toHaveBeenCalledWith('To Kill a Mockingbird');
      }, { timeout: 5000 });

      // Wait for the result to appear in the DOM
      const resultTitle = await screen.findByText('To Kill a Mockingbird', {}, { timeout: 5000 });
      
      // Click on the result card (the parent div is clickable)
      const resultCard = resultTitle.closest('div[class*="cursor-pointer"]');
      await user.click(resultCard);

      // Should open Add/Edit modal with pre-filled data
      await waitFor(() => {
        expect(screen.getByText(/add new item/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify pre-filled data using placeholders
      const titleInput = screen.getByPlaceholderText(/enter title/i);
      expect(titleInput).toHaveValue('To Kill a Mockingbird');

      const authorInput = screen.getByPlaceholderText(/enter author/i);
      expect(authorInput).toHaveValue('Harper Lee');

      const yearInput = screen.getByPlaceholderText(/enter year/i);
      expect(yearInput).toHaveValue(1960);

      // Set status before saving
      const toReadButton = screen.getByRole('button', { name: /^to read$/i });
      await user.click(toReadButton);

      // Save
      const saveButton = screen.getByRole('button', { name: /save item/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockStorage.saveItem).toHaveBeenCalled();
      }, { timeout: 5000 });

      const savedItem = mockStorage.saveItem.mock.calls[0][0];
      expect(savedItem).toMatchObject({
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        year: 1960,
        status: 'to-read',
        coverUrl: 'https://example.com/cover.jpg'
      });
    });

    it('should search for and add a movie from OMDb', async () => {
      // Mock OMDb service availability and response
      omdbService.isServiceAvailable.mockReturnValue(true);
      omdbService.searchMovies.mockResolvedValue([
        {
          title: 'The Matrix',
          director: 'Lana Wachowski, Lilly Wachowski',
          year: 1999,
          coverUrl: 'https://example.com/matrix.jpg',
          imdbID: 'tt0133093',
          type: 'movie',
          actors: ['Keanu Reeves', 'Laurence Fishburne'],
          plot: 'A computer hacker learns about the true nature of reality.',
          genre: 'Sci-Fi'
        }
      ]);

      render(<MediaTracker />);

      // Setup storage
      const filesystemButton = await screen.findByRole('button', { name: /local files/i }, { timeout: 3000 });
      await user.click(filesystemButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Open search modal
      const searchButton = screen.getByRole('button', { name: /add new media|search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/search books.*movies/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Wait for the modal to be fully rendered
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search for books/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Switch to movie tab - use getAllByRole to find all buttons, then filter by text
      const allButtons = screen.getAllByRole('button');
      const movieTab = allButtons.find(btn => btn.textContent.toLowerCase().includes('movie'));
      expect(movieTab).toBeDefined();
      await user.click(movieTab);

      // Wait for the placeholder to update
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search for movies/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Search for a movie
      const searchInput = screen.getByPlaceholderText(/search for movies/i);
      await user.click(searchInput);
      await user.clear(searchInput);
      await user.paste('The Matrix');

      // Find and click the Search button (not the "Add new media" button)
      const searchButtons = screen.getAllByRole('button', { name: /search/i });
      const searchSubmitButton = searchButtons.find(btn => btn.textContent === 'Search');
      expect(searchSubmitButton).toBeDefined();
      await user.click(searchSubmitButton);

      // Wait for results
      await waitFor(() => {
        expect(omdbService.searchMovies).toHaveBeenCalledWith('The Matrix');
      }, { timeout: 5000 });

      // Wait for the result to appear and click on it
      const resultTitle = await screen.findByText('The Matrix', {}, { timeout: 5000 });
      const resultCard = resultTitle.closest('div[class*="cursor-pointer"]');
      await user.click(resultCard);

      // Should open Add/Edit modal
      await waitFor(() => {
        expect(screen.getByText(/add new item/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify pre-filled data using placeholders
      const titleInput = screen.getByPlaceholderText(/enter title/i);
      expect(titleInput).toHaveValue('The Matrix');

      const directorInput = screen.getByPlaceholderText(/enter director/i);
      expect(directorInput).toHaveValue('Lana Wachowski, Lilly Wachowski');

      // Set status
      const watchedButton = screen.getByRole('button', { name: /^watched$/i });
      await user.click(watchedButton);

      // Save
      const saveButton = screen.getByRole('button', { name: /save item/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockStorage.saveItem).toHaveBeenCalled();
      }, { timeout: 5000 });

      const savedItem = mockStorage.saveItem.mock.calls[0][0];
      expect(savedItem).toMatchObject({
        title: 'The Matrix',
        director: 'Lana Wachowski, Lilly Wachowski',
        year: 1999,
        status: 'watched'
      });
    });
  });

  describe('Edit Item Flow', () => {
    it('should save an updated item via useItems hook', async () => {
      const existingItem = {
        id: 'the-great-gatsby',
        filename: 'the-great-gatsby.md',
        title: 'The Great Gatsby',
        type: 'book',
        author: 'F. Scott Fitzgerald',
        year: 1925,
        status: 'to-read',
        rating: 0,
        tags: ['classic'],
        dateAdded: new Date().toISOString(),
        review: ''
      };

      mockStorage.loadItems.mockImplementation((progressCallback) => {
        if (progressCallback) {
          progressCallback({ processed: 1, total: 1, items: [existingItem] });
        }
        return Promise.resolve([existingItem]);
      });

      const { result } = renderHook(() => useItems());

      await act(async () => {
        await result.current.initializeStorage();
      });

      await act(async () => {
        await result.current.selectStorage('filesystem');
      });

      // Edit the item
      const updatedItem = { ...existingItem, status: 'read', rating: 5, tags: ['classic', 'must-read'] };
      await act(async () => {
        await result.current.saveItem(updatedItem);
      });

      expect(mockStorage.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'read', rating: 5, tags: ['classic', 'must-read'] })
      );
    });
  });

  describe('Delete and Undo Flow', () => {
    it('should delete an item and push to undoStack via useItems hook', async () => {
      const existingItem = {
        id: 'test-book',
        filename: 'test-book.md',
        title: 'Test Book',
        type: 'book',
        author: 'Test Author',
        status: 'read',
        year: 2023,
        rating: 0,
        tags: [],
        dateAdded: new Date().toISOString(),
        review: ''
      };

      const undoInfo = { id: existingItem.id, filename: existingItem.filename };
      mockStorage.deleteItem.mockResolvedValue(undoInfo);
      mockStorage.restoreItem.mockResolvedValue(existingItem);

      const { result } = renderHook(() => useItems());
      await act(async () => { await result.current.selectStorage('filesystem'); });

      // Manually inject the item into state so we can delete it
      await act(async () => { await result.current.saveItem(existingItem); });

      // Confirm saveItem was called, then delete
      await act(async () => { await result.current.deleteItem(existingItem); });

      expect(mockStorage.deleteItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-book' })
      );
      // undoStack is exported as its length (a number) from useItems
      expect(result.current.undoStack).toBe(1);

      // Undo the deletion
      await act(async () => { await result.current.undoLastDelete(); });
      expect(mockStorage.restoreItem).toHaveBeenCalled();
      expect(result.current.undoStack).toBe(0);
    });

    it('should leave undoStack empty when delete operation fails', async () => {
      const existingItem = {
        id: 'test-book-2',
        filename: 'test-book-2.md',
        title: 'Test Book 2',
        type: 'book',
        author: 'Test Author',
        status: 'read',
        year: 2023,
        rating: 0,
        tags: [],
        dateAdded: new Date().toISOString(),
        review: ''
      };

      mockStorage.deleteItem.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useItems());
      await act(async () => { await result.current.selectStorage('filesystem'); });

      await act(async () => { await result.current.saveItem(existingItem); });

      // deleteItem re-throws on error — catch it
      await act(async () => {
        try {
          await result.current.deleteItem(existingItem);
        } catch {
          // expected — deleteItem re-throws
        }
      });

      expect(result.current.undoStack).toBe(0);
    });
  });

  describe('Complete Workflow: Add → Edit → Delete via useItems', () => {
    it('should support full add → edit → delete lifecycle via hook', async () => {
      const { result } = renderHook(() => useItems());

      await act(async () => { await result.current.initializeStorage(); });
      await act(async () => { await result.current.selectStorage('filesystem'); });

      // 1. Add item
      const newItem = {
        id: 'full-lifecycle-book',
        filename: 'full-lifecycle-book.md',
        title: 'Full Lifecycle Book',
        type: 'book',
        author: 'Test Author',
        status: 'reading',
        rating: 0,
        tags: [],
        dateAdded: new Date().toISOString()
      };

      await act(async () => { await result.current.saveItem(newItem); });
      expect(mockStorage.saveItem).toHaveBeenCalledTimes(1);

      // 2. Edit item — update mock to return the item so hook can track it
      mockStorage.loadItems.mockResolvedValue([newItem]);
      const editedItem = { ...newItem, status: 'read', rating: 4 };
      await act(async () => { await result.current.saveItem(editedItem); });
      expect(mockStorage.saveItem).toHaveBeenCalledTimes(2);
      expect(mockStorage.saveItem).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'read', rating: 4 })
      );

      // 3. Delete item
      mockStorage.deleteItem.mockResolvedValue({ id: newItem.id, filename: newItem.filename });
      await act(async () => { await result.current.deleteItem(editedItem); });
      expect(mockStorage.deleteItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'full-lifecycle-book' })
      );
    });
  });
});
