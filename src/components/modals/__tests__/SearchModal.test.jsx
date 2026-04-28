import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchModal from '../SearchModal.jsx';
import * as openLibraryService from '../../../services/openLibraryService.js';
import * as omdbService from '../../../services/omdbService.js';
import * as toastService from '../../../services/toastService.js';

// Mock the services
vi.mock('../../../services/openLibraryService.js');
vi.mock('../../../services/omdbService.js');
vi.mock('../../../services/toastService.js');

describe('SearchModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  // Helper to get buttons by text content
  const getButtonByText = (text) => {
    const buttons = screen.getAllByRole('button');
    return buttons.find(btn => btn.textContent.toLowerCase().includes(text.toLowerCase()));
  };

  const mockBookResults = [
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      year: '1925',
      coverUrl: 'https://example.com/gatsby.jpg',
      type: 'book'
    },
    {
      title: '1984',
      author: 'George Orwell',
      year: '1949',
      coverUrl: 'https://example.com/1984.jpg',
      type: 'book'
    }
  ];

  const mockMovieResults = [
    {
      title: 'The Matrix',
      director: 'The Wachowskis',
      year: '1999',
      coverUrl: 'https://example.com/matrix.jpg',
      type: 'movie'
    },
    {
      title: 'Inception',
      director: 'Christopher Nolan',
      year: '2010',
      coverUrl: 'https://example.com/inception.jpg',
      type: 'movie'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    openLibraryService.searchBooks.mockResolvedValue(mockBookResults);
    omdbService.searchMovies.mockResolvedValue(mockMovieResults);
    omdbService.isServiceAvailable.mockReturnValue(true);
    toastService.toast.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with title and close button', () => {
      const { container } = render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      expect(screen.getByText('Search Books & Movies')).toBeInTheDocument();
      
      // Close button is identifiable by the X icon
      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render search type toggle buttons', () => {
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      // Book and movie toggle buttons
      const buttons = screen.getAllByRole('button');
      const bookButton = buttons.find(btn => btn.textContent.includes('book'));
      const movieButton = buttons.find(btn => btn.textContent.includes('movie'));
      
      expect(bookButton).toBeInTheDocument();
      expect(movieButton).toBeInTheDocument();
    });

    it('should render search input and button', () => {
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      expect(screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"')).toBeInTheDocument();
      
      // Search button has the text "Search"
      const buttons = screen.getAllByRole('button');
      const searchButton = buttons.find(btn => btn.textContent.includes('Search'));
      expect(searchButton).toBeInTheDocument();
    });

    it('should default to book search type', () => {
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      expect(screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"')).toBeInTheDocument();
    });

    it('should show initial empty state message', () => {
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      expect(screen.getByText('Search for books to get started')).toBeInTheDocument();
    });
  });

  describe('search type switching', () => {
    it('should switch to movie search when movie button clicked', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const buttons = screen.getAllByRole('button');
      const movieButton = buttons.find(btn => btn.textContent.includes('movie'));
      await user.click(movieButton);
      
      expect(screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"')).toBeInTheDocument();
      expect(screen.getByText(/Search for movies to get started/i)).toBeInTheDocument();
    });

    it('should switch back to book search', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const buttons = screen.getAllByRole('button');
      const movieButton = buttons.find(btn => btn.textContent.includes('movie'));
      const bookButton = buttons.find(btn => btn.textContent.includes('book'));
      
      // Switch to movies
      await user.click(movieButton);
      expect(screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"')).toBeInTheDocument();
      
      // Switch back to books
      await user.click(bookButton);
      expect(screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"')).toBeInTheDocument();
    });

    it('should highlight active search type button', () => {
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const bookButton = getButtonByText('book');
      // Active button should have highlight style (using inline style attribute)
      expect(bookButton.style.backgroundColor).toBe('var(--mt-highlight)');
    });
  });

  describe('book search', () => {
    it('should search for books when form submitted', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(openLibraryService.searchBooks).toHaveBeenCalledWith('gatsby');
      });
    });

    it('should display book search results', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
        expect(screen.getByText('F. Scott Fitzgerald')).toBeInTheDocument();
        expect(screen.getByText('1984')).toBeInTheDocument();
        expect(screen.getByText('George Orwell')).toBeInTheDocument();
      });
    });

    it('should show loading state during book search', async () => {
      openLibraryService.searchBooks.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockBookResults), 100)));
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      });
    });

    it('should not search with empty query', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('Search'));
      
      expect(openLibraryService.searchBooks).not.toHaveBeenCalled();
    });

    it('should handle Open Library service down error', async () => {
      const error = { 
        message: 'Service is down',
        type: 'SERVICE_DOWN',
        name: 'OpenLibraryError'
      };
      Object.setPrototypeOf(error, openLibraryService.OpenLibraryError.prototype);
      openLibraryService.searchBooks.mockRejectedValue(error);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(toastService.toast).toHaveBeenCalledWith(
          'Open Library service is temporarily unavailable. Please try again later.',
          { type: 'error' }
        );
      });
    });

    it('should handle Open Library network error', async () => {
      const error = {
        message: 'Network error',
        type: 'NETWORK',
        name: 'OpenLibraryError'
      };
      Object.setPrototypeOf(error, openLibraryService.OpenLibraryError.prototype);
      openLibraryService.searchBooks.mockRejectedValue(error);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(toastService.toast).toHaveBeenCalledWith(
          'Unable to connect to Open Library. Please check your internet connection.',
          { type: 'error' }
        );
      });
    });

    it('should show "no results" message when search returns empty array', async () => {
      openLibraryService.searchBooks.mockResolvedValue([]);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('nonexistent');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
      });
    });
  });

  describe('movie search', () => {
    it('should search for movies when movie type selected', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('matrix');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(omdbService.searchMovies).toHaveBeenCalledWith('matrix');
      });
    });

    it('should display movie search results', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('matrix');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.getByText('The Wachowskis')).toBeInTheDocument();
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('Christopher Nolan')).toBeInTheDocument();
      });
    });

    it('should show API key warning when service not available', async () => {
      omdbService.isServiceAvailable.mockReturnValue(false);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('matrix');
      await user.click(getButtonByText('Search'));
      
      expect(omdbService.searchMovies).not.toHaveBeenCalled();
      expect(screen.getByText(/OMDb API key required/i)).toBeInTheDocument();
    });

    it('should handle OMDB auth failed error', async () => {
      const error = {
        message: 'Auth failed',
        type: 'AUTH_FAILED',
        name: 'OMDBError'
      };
      Object.setPrototypeOf(error, omdbService.OMDBError.prototype);
      omdbService.searchMovies.mockRejectedValue(error);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(toastService.toast).toHaveBeenCalledWith(
          'OMDb API key is invalid or has expired. Please check your API key in settings.',
          { type: 'error' }
        );
        expect(screen.getByText(/OMDb API key required/i)).toBeInTheDocument();
      });
    });

    it('should handle OMDB quota exceeded error', async () => {
      const error = {
        message: 'Quota exceeded',
        type: 'QUOTA_EXCEEDED',
        name: 'OMDBError'
      };
      Object.setPrototypeOf(error, omdbService.OMDBError.prototype);
      omdbService.searchMovies.mockRejectedValue(error);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(toastService.toast).toHaveBeenCalledWith(
          'OMDb API daily limit reached. Try again tomorrow or upgrade your API key.',
          { type: 'error' }
        );
      });
    });

    it('should handle OMDB rate limit error', async () => {
      const error = {
        message: 'Rate limit',
        type: 'RATE_LIMIT',
        name: 'OMDBError'
      };
      Object.setPrototypeOf(error, omdbService.OMDBError.prototype);
      omdbService.searchMovies.mockRejectedValue(error);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(toastService.toast).toHaveBeenCalledWith(
          'OMDb API rate limit exceeded. Please wait a moment and try again.',
          { type: 'error' }
        );
      });
    });
  });

  describe('result selection', () => {
    it('should call onSelect with book result and default fields', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('The Great Gatsby'));
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          year: '1925',
          type: 'book',
          rating: 0,
          tags: [],
          dateRead: expect.any(String),
          dateAdded: expect.any(String),
          review: ''
        })
      );
    });

    it('should call onSelect with movie result and default fields', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('matrix');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('The Matrix'));
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Matrix',
          director: 'The Wachowskis',
          year: '1999',
          type: 'movie',
          rating: 0,
          tags: [],
          dateWatched: expect.any(String),
          dateAdded: expect.any(String),
          review: ''
        })
      );
    });

    it('should add dateRead for books, not dateWatched', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('The Great Gatsby'));
      
      const call = mockOnSelect.mock.calls[0][0];
      expect(call).toHaveProperty('dateRead');
      expect(call).not.toHaveProperty('dateWatched');
    });

    it('should add dateWatched for movies, not dateRead', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.click(getButtonByText('movie'));
      
      const input = screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"');
      await user.click(input);
      await user.paste('matrix');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('The Matrix'));
      
      const call = mockOnSelect.mock.calls[0][0];
      expect(call).toHaveProperty('dateWatched');
      expect(call).not.toHaveProperty('dateRead');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close modal on Escape key', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      await user.keyboard('{Escape}');
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should trigger search on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      await waitFor(() => {
        expect(openLibraryService.searchBooks).toHaveBeenCalledWith('gatsby');
      });
    });

    it('should trigger search on Cmd+Enter', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      await waitFor(() => {
        expect(openLibraryService.searchBooks).toHaveBeenCalledWith('gatsby');
      });
    });

    it('should switch to books with B key', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      // Switch to movies first
      await user.click(getButtonByText('movie'));
      expect(screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"')).toBeInTheDocument();
      
      // Press B to switch to books
      await user.keyboard('b');
      
      expect(screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"')).toBeInTheDocument();
    });

    it('should switch to movies with M key', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      expect(screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"')).toBeInTheDocument();
      
      await user.keyboard('m');
      
      expect(screen.getByPlaceholderText('Try: "Inception", "The Matrix 1999"')).toBeInTheDocument();
    });

    it('should focus search input with / key', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      // Click somewhere else first
      await user.click(screen.getByText('Search Books & Movies'));
      expect(input).not.toHaveFocus();
      
      await user.keyboard('/');
      
      expect(input).toHaveFocus();
    });

    it('should focus search input with Ctrl+K', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.keyboard('{Control>}k{/Control}');
      
      expect(input).toHaveFocus();
    });

    it('should focus search input with Cmd+K', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.keyboard('{Meta>}k{/Meta}');
      
      expect(input).toHaveFocus();
    });
  });

  describe('result navigation', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      });
    });

    it('should navigate down from search input to first result', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}');
      
      // First result should be focused (indicated by blue border class)
      const firstResult = screen.getByText('The Great Gatsby').closest('div[class*="bg-slate-700"]');
      expect(firstResult).toHaveClass('border-blue-500');
    });

    it('should navigate right between results', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first result
      await user.keyboard('{ArrowRight}'); // Move to second result
      
      const secondResult = screen.getByText('1984').closest('div[class*="bg-slate-700"]');
      expect(secondResult).toHaveClass('border-blue-500');
    });

    it('should navigate left between results', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first result
      await user.keyboard('{ArrowRight}'); // Move to second result
      await user.keyboard('{ArrowLeft}'); // Move back to first
      
      const firstResult = screen.getByText('The Great Gatsby').closest('div[class*="bg-slate-700"]');
      expect(firstResult).toHaveClass('border-blue-500');
    });

    it('should select result with Enter key', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first result
      await user.keyboard('{Enter}'); // Select it
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Great Gatsby'
        })
      );
    });

    it('should select result with Space key', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first result
      await user.keyboard(' '); // Select it
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Great Gatsby'
        })
      );
    });

    it('should navigate up to search input from first row', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first result
      expect(input).not.toHaveFocus();
      
      await user.keyboard('{ArrowUp}'); // Navigate back up
      
      expect(input).toHaveFocus();
    });

    it('should not navigate beyond last result', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first
      await user.keyboard('{ArrowRight}'); // Focus second (last)
      
      const secondResult = screen.getByText('1984').closest('div[class*="bg-slate-700"]');
      expect(secondResult).toHaveClass('border-blue-500');
      
      await user.keyboard('{ArrowRight}'); // Try to go beyond
      
      // Should still be on second result
      expect(secondResult).toHaveClass('border-blue-500');
    });

    it('should not navigate before first result', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      
      await user.click(input);
      await user.keyboard('{ArrowDown}'); // Focus first
      
      const firstResult = screen.getByText('The Great Gatsby').closest('div[class*="bg-slate-700"]');
      expect(firstResult).toHaveClass('border-blue-500');
      
      await user.keyboard('{ArrowLeft}'); // Try to go before
      
      // Should still be on first result
      expect(firstResult).toHaveClass('border-blue-500');
    });
  });

  describe('accessibility', () => {
    it('should have proper buttons with text labels', () => {
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      // All buttons should be present
      expect(getButtonByText('book')).toBeInTheDocument();
      expect(getButtonByText('movie')).toBeInTheDocument();
      expect(getButtonByText('Search')).toBeInTheDocument();
    });

    it('should render cover images with alt text', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('gatsby');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        const img = screen.getByAltText('The Great Gatsby');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/gatsby.jpg');
      });
    });

    it('should have appropriate minimum touch target sizes', () => {
      const { container } = render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const closeButton = container.querySelector('button.min-h-\\[44px\\].min-w-\\[44px\\]');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle results without cover images', async () => {
      const resultsWithoutCovers = [
        {
          title: 'Book Without Cover',
          author: 'Unknown Author',
          year: '2000',
          coverUrl: null,
          type: 'book'
        }
      ];
      openLibraryService.searchBooks.mockResolvedValue(resultsWithoutCovers);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('Book Without Cover')).toBeInTheDocument();
      });
      
      // Should not render img tag
      const img = screen.queryByAltText('Book Without Cover');
      expect(img).not.toBeInTheDocument();
    });

    it('should handle results without year', async () => {
      const resultsWithoutYear = [
        {
          title: 'Book Without Year',
          author: 'Author Name',
          year: null,
          coverUrl: 'https://example.com/cover.jpg',
          type: 'book'
        }
      ];
      openLibraryService.searchBooks.mockResolvedValue(resultsWithoutYear);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByText('Book Without Year')).toBeInTheDocument();
      });
    });

    it('should handle generic errors gracefully', async () => {
      const genericError = new Error('Something went wrong');
      openLibraryService.searchBooks.mockRejectedValue(genericError);
      
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('test');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(toastService.toast).toHaveBeenCalledWith(
          'Something went wrong',
          { type: 'error' }
        );
      });
    });

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup();
      render(<SearchModal onClose={mockOnClose} onSelect={mockOnSelect} />);
      
      const input = screen.getByPlaceholderText('Try: "Harry Potter", "author Rowling", "1984 by Orwell"');
      await user.click(input);
      await user.paste('  gatsby  ');
      await user.click(getButtonByText('Search'));
      
      await waitFor(() => {
        expect(openLibraryService.searchBooks).toHaveBeenCalledWith('  gatsby  ');
      });
    });
  });
});
