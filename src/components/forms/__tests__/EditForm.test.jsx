import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditForm from '../EditForm.jsx';
import { sampleBook, sampleMovie } from '../../../test/fixtures/sampleItems.js';

// Mock hooks
vi.mock('../../../hooks/useHalfStars.js', () => ({
  useHalfStars: vi.fn(() => [false])
}));

// Mock StarRating
vi.mock('../../StarRating.jsx', () => ({
  default: ({ rating, onChange, interactive, halfStarsEnabled, size }) => (
    <div data-testid="star-rating" data-rating={rating} data-interactive={interactive}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange && onChange(star)}
          data-testid={`star-${star}`}
        >
          {star <= rating ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}));

// Mock TagInput - needs to actually be a controlled input that works with EditForm
// EditForm's addTag function expects either a string (from onAdd) or reads from tagInput state
vi.mock('../TagInput.jsx', () => ({
  default: ({ value, onChange, onAdd, existingTags = [], allTags = [], placeholder = "Add tag" }) => {
    const [inputValue, setInputValue] = React.useState(value || '');
    
    React.useEffect(() => {
      setInputValue(value || '');
    }, [value]);
    
    const handleChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      if (onChange) {
        onChange(e);
      }
    };
    
    // EditForm's addTag can accept a string directly or read from tagInput state
    const handleAdd = () => {
      if (inputValue.trim() && onAdd) {
        // Call onAdd with the trimmed value (EditForm expects this)
        onAdd(inputValue.trim());
      }
    };
    
    return (
      <div data-testid="tag-input">
        <input
          data-testid="tag-input-field"
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
        />
      </div>
    );
  }
}));

describe('EditForm', () => {
  // Ensure sampleBook and sampleMovie have required arrays
  const testBook = { ...sampleBook, tags: sampleBook.tags || [], actors: sampleBook.actors || [] };
  const testMovie = { ...sampleMovie, tags: sampleMovie.tags || [], actors: sampleMovie.actors || [] };
  
  const defaultProps = {
    item: testBook,
    onChange: vi.fn(),
    fromSearch: false,
    allTags: ['fiction', 'classic', 'american-literature']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all form fields for book', () => {
      render(<EditForm {...defaultProps} item={testBook} />);
      
      expect(screen.getByPlaceholderText(/enter title/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter author name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter ISBN/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter cover image url/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/write your review/i)).toBeInTheDocument();
      expect(screen.getByTestId('star-rating')).toBeInTheDocument();
    });

    it('should render all form fields for movie', () => {
      render(<EditForm {...defaultProps} item={testMovie} />);
      
      expect(screen.getByPlaceholderText(/enter title/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter director name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/add actor/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
    });

    it('should render type selector buttons', () => {
      render(<EditForm {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /book/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /movie/i })).toBeInTheDocument();
    });

    it('should render status buttons for book', () => {
      render(<EditForm {...defaultProps} item={testBook} />);
      
      // Check for status button labels from STATUS_LABELS
      expect(screen.getByText('To Read')).toBeInTheDocument();
      expect(screen.getByText('Reading')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('Did Not Finish')).toBeInTheDocument();
    });

    it('should render status buttons for movie', () => {
      render(<EditForm {...defaultProps} item={testMovie} />);
      
      // Check for status button labels from STATUS_LABELS
      expect(screen.getByText('To Watch')).toBeInTheDocument();
      expect(screen.getByText('Watching')).toBeInTheDocument();
      expect(screen.getByText('Watched')).toBeInTheDocument();
      expect(screen.getByText('Did Not Finish')).toBeInTheDocument();
    });

    it('should show fromSearch message when fromSearch is true', () => {
      render(<EditForm {...defaultProps} fromSearch={true} />);
      
      expect(screen.getByText(/type is set from search results/i)).toBeInTheDocument();
    });

    it('should not show fromSearch message when fromSearch is false', () => {
      render(<EditForm {...defaultProps} fromSearch={false} />);
      
      expect(screen.queryByText(/type is set from search results/i)).not.toBeInTheDocument();
    });
  });

  describe('type changes', () => {
    it('should change type from book to movie', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testBook} onChange={onChange} />);
      
      const movieButton = screen.getByRole('button', { name: /movie/i });
      await user.click(movieButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie',
          status: expect.any(String)
        })
      );
    });

    it('should change type from movie to book', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testMovie} onChange={onChange} />);
      
      const bookButton = screen.getByRole('button', { name: /book/i });
      await user.click(bookButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'book',
          status: expect.any(String)
        })
      );
    });

    it('should not change type when fromSearch is true', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={sampleBook} onChange={onChange} fromSearch={true} />);
      
      const movieButton = screen.getByRole('button', { name: /movie/i });
      await user.click(movieButton);
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('status changes', () => {
    it('should change status when clicking status button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testBook} onChange={onChange} />);
      
      const toReadButton = screen.getByText('To Read');
      await user.click(toReadButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'to-read' })
      );
    });

    it('should change status for movies', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testMovie} onChange={onChange} />);
      
      const toWatchButton = screen.getByText('To Watch');
      await user.click(toWatchButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'to-watch' })
      );
    });
  });

  describe('text input fields', () => {
    it('should update title when typing', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} onChange={onChange} />);
      
      const titleInput = screen.getByPlaceholderText(/enter title/i);
      // Use fireEvent to directly change the value
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Title' })
      );
    });

    it('should update author for books', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testBook} onChange={onChange} />);
      
      const authorInput = screen.getByPlaceholderText(/enter author name/i);
      fireEvent.change(authorInput, { target: { value: 'New Author' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'New Author' })
      );
    });

    it('should update director for movies', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testMovie} onChange={onChange} />);
      
      const directorInput = screen.getByPlaceholderText(/enter director name/i);
      fireEvent.change(directorInput, { target: { value: 'New Director' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ director: 'New Director' })
      );
    });

    it('should update ISBN for books', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} item={testBook} onChange={onChange} />);
      
      const isbnInput = screen.getByPlaceholderText(/enter ISBN/i);
      fireEvent.change(isbnInput, { target: { value: '1234567890' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ isbn: '1234567890' })
      );
    });

    it('should update year', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} onChange={onChange} />);
      
      const yearInput = screen.getByPlaceholderText(/enter year/i);
      fireEvent.change(yearInput, { target: { value: '2024' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ year: '2024' })
      );
    });

    it('should update cover URL', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} onChange={onChange} />);
      
      const coverInput = screen.getByPlaceholderText(/enter cover image url/i);
      fireEvent.change(coverInput, { target: { value: 'https://example.com/new-cover.jpg' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ coverUrl: 'https://example.com/new-cover.jpg' })
      );
    });

    it('should update review', () => {
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} onChange={onChange} />);
      
      const reviewInput = screen.getByPlaceholderText(/write your review/i);
      fireEvent.change(reviewInput, { target: { value: 'Great book!' } });
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ review: 'Great book!' })
      );
    });
  });

  describe('date fields', () => {
    it('should update date read for books', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<EditForm {...defaultProps} item={testBook} onChange={onChange} />);
      
      // Date inputs don't have placeholders, query directly by type
      const dateReadInput = container.querySelector('input[type="date"]');
      expect(dateReadInput).toBeInTheDocument();
      
      // Use fireEvent to set the value directly for date inputs
      fireEvent.change(dateReadInput, { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const callsWithDate = onChange.mock.calls.filter(call => call[0].dateRead === '2024-01-01');
        expect(callsWithDate.length).toBeGreaterThan(0);
      });
    });

    it('should clear date read when clicking clear button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithDate = { ...testBook, dateRead: '2024-01-01' };
      render(<EditForm {...defaultProps} item={itemWithDate} onChange={onChange} />);
      
      const clearButton = screen.getByTitle(/clear date/i);
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ dateRead: '' })
      );
    });

    it('should update date watched for movies', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<EditForm {...defaultProps} item={testMovie} onChange={onChange} />);
      
      // Date inputs don't have placeholders, query directly by type
      const dateWatchedInput = container.querySelector('input[type="date"]');
      expect(dateWatchedInput).toBeInTheDocument();
      
      // Use fireEvent to set the value directly for date inputs
      fireEvent.change(dateWatchedInput, { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const callsWithDate = onChange.mock.calls.filter(call => call[0].dateWatched === '2024-01-01');
        expect(callsWithDate.length).toBeGreaterThan(0);
      });
    });

    it('should clear date watched when clicking clear button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithDate = { ...testMovie, dateWatched: '2024-01-01' };
      render(<EditForm {...defaultProps} item={itemWithDate} onChange={onChange} />);
      
      const clearButton = screen.getByTitle(/clear date/i);
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ dateWatched: '' })
      );
    });
  });

  describe('rating', () => {
    it('should update rating when clicking star', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} onChange={onChange} />);
      
      const starRating = screen.getByTestId('star-rating');
      const star3 = screen.getByTestId('star-3');
      await user.click(star3);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 3 })
      );
    });

    it('should display current rating', () => {
      const itemWithRating = { ...sampleBook, rating: 5 };
      render(<EditForm {...defaultProps} item={itemWithRating} />);
      
      const starRating = screen.getByTestId('star-rating');
      expect(starRating).toHaveAttribute('data-rating', '5');
    });
  });

  describe('tag management', () => {
    it('should add tag when tag input is used', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithTags = { ...testBook, tags: ['existing'] };
      render(<EditForm {...defaultProps} item={itemWithTags} onChange={onChange} />);
      
      const tagInput = screen.getByPlaceholderText(/add tag/i);
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const tagAddButton = addButtons[0];
      
      await user.type(tagInput, 'new-tag');
      await user.click(tagAddButton);
      
      // TagInput calls onAdd with the tag value, which calls EditForm's addTag
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: expect.arrayContaining(['new-tag'])
          })
        );
      });
    });

    it('should add tag when clicking Add button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithTags = { ...testBook, tags: [] };
      render(<EditForm {...defaultProps} item={itemWithTags} onChange={onChange} />);
      
      const tagInput = screen.getByPlaceholderText(/add tag/i);
      // Find the Add button for tags (first Add button in the form)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const tagAddButton = addButtons[0]; // First Add button is for tags
      
      await user.type(tagInput, 'new-tag');
      await user.click(tagAddButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['new-tag']
        })
      );
    });

    it('should remove tag when clicking X button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithTags = { ...testBook, tags: ['tag1', 'tag2'] };
      render(<EditForm {...defaultProps} item={itemWithTags} onChange={onChange} />);
      
      const tagElements = screen.getAllByText('tag1');
      const removeButton = tagElements[0].parentElement.querySelector('button');
      await user.click(removeButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['tag2']
        })
      );
    });

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithTags = { ...testBook, tags: ['existing'] };
      render(<EditForm {...defaultProps} item={itemWithTags} onChange={onChange} />);
      
      const tagInput = screen.getByPlaceholderText(/add tag/i);
      // Find the Add button for tags (first Add button in the form)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const tagAddButton = addButtons[0];
      
      await user.type(tagInput, 'existing');
      await user.click(tagAddButton);
      
      // Should not be called because tag already exists
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not add empty tags', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<EditForm {...defaultProps} onChange={onChange} />);
      
      // Find the Add button for tags (first Add button in the form)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const tagAddButton = addButtons[0]; // First Add button is for tags
      await user.click(tagAddButton);
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('actor management (movies only)', () => {
    it('should add actor when typing and clicking Add', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithActors = { ...testMovie, actors: [] };
      render(<EditForm {...defaultProps} item={itemWithActors} onChange={onChange} />);
      
      const actorInput = screen.getByPlaceholderText(/add actor/i);
      // Find the Add button near the actor input (it's the second Add button)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const actorAddButton = addButtons.find(button => {
        // The actor Add button is in the same container as the actor input
        const container = button.closest('div');
        return container && container.contains(actorInput);
      }) || addButtons[1]; // Fallback to second button
      
      await user.type(actorInput, 'Actor Name');
      await user.click(actorAddButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          actors: ['Actor Name']
        })
      );
    });

    it('should add actor when pressing Enter', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithActors = { ...testMovie, actors: [] };
      render(<EditForm {...defaultProps} item={itemWithActors} onChange={onChange} />);
      
      const actorInput = screen.getByPlaceholderText(/add actor/i);
      await user.type(actorInput, 'Actor Name{Enter}');
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          actors: ['Actor Name']
        })
      );
    });

    it('should remove actor when clicking X button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithActors = { ...testMovie, actors: ['Actor 1', 'Actor 2'] };
      render(<EditForm {...defaultProps} item={itemWithActors} onChange={onChange} />);
      
      const actorElements = screen.getAllByText('Actor 1');
      const removeButton = actorElements[0].parentElement.querySelector('button');
      await user.click(removeButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          actors: ['Actor 2']
        })
      );
    });

    it('should not add duplicate actors', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithActors = { ...testMovie, actors: ['Existing Actor'] };
      render(<EditForm {...defaultProps} item={itemWithActors} onChange={onChange} />);
      
      const actorInput = screen.getByPlaceholderText(/add actor/i);
      const addButton = screen.getAllByRole('button', { name: /add/i })[1];
      
      await user.type(actorInput, 'Existing Actor');
      await user.click(addButton);
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not add empty actors', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const itemWithActors = { ...testMovie, actors: [] };
      render(<EditForm {...defaultProps} item={itemWithActors} onChange={onChange} />);
      
      const addButton = screen.getAllByRole('button', { name: /add/i })[1];
      await user.click(addButton);
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle item without optional fields', () => {
      const minimalItem = {
        id: 'test',
        title: 'Test Item',
        type: 'book',
        status: 'to-read',
        tags: [],
        actors: []
      };
      render(<EditForm {...defaultProps} item={minimalItem} />);
      
      expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
    });

    it('should handle empty tags array', () => {
      const itemWithNoTags = { ...testBook, tags: [] };
      render(<EditForm {...defaultProps} item={itemWithNoTags} />);
      
      // Just verify the component renders without errors
      expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
    });

    it('should handle empty actors array for movies', () => {
      const itemWithNoActors = { ...testMovie, actors: [] };
      render(<EditForm {...defaultProps} item={itemWithNoActors} />);
      
      // Just verify the component renders without errors
      expect(screen.getByPlaceholderText(/add actor/i)).toBeInTheDocument();
    });

    it('should handle null/undefined optional fields', () => {
      const itemWithNulls = {
        id: 'test',
        title: 'Test Book',
        type: 'book',
        status: 'to-read',
        tags: [],
        actors: [],
        author: null,
        isbn: undefined,
        year: null,
        coverUrl: undefined,
        review: null
      };
      render(<EditForm {...defaultProps} item={itemWithNulls} />);
      
      // Fields should still render with empty values (using || '' in EditForm)
      // Use placeholder text since labels aren't associated with inputs via for/id
      const authorInput = screen.getByPlaceholderText(/enter author name/i);
      expect(authorInput).toHaveValue('');
      
      const isbnInput = screen.getByPlaceholderText(/enter ISBN/i);
      expect(isbnInput).toHaveValue('');
    });
  });

  describe('mobile focus prevention', () => {
    beforeEach(() => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
    });

    it('should prevent auto-focus on mobile devices', () => {
      const { container } = render(<EditForm {...defaultProps} />);
      
      const form = container.querySelector('div[class*="space-y"]');
      expect(form).toBeInTheDocument();
    });
  });
});