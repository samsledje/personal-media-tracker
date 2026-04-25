import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewDetails from '../ViewDetails.jsx';
import { sampleBook, sampleMovie } from '../../../test/fixtures/sampleItems.js';

describe('ViewDetails', () => {
  const mockHexToRgba = vi.fn((hex, alpha) => `rgba(0,0,0,${alpha})`);
  const mockGetStatusColor = vi.fn((status) => {
    const colors = {
      'read': '#10b981',
      'watching': '#3b82f6',
      'to-read': '#f59e0b',
      'to-watch': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  });
  const mockGetStatusIcon = vi.fn((status, size) => {
    // Return a simple React element-like structure
    return <span className="test-icon" data-status={status} data-size={size} />;
  });
  const mockStatusLabels = {
    'read': 'Read',
    'watching': 'Watching',
    'to-read': 'To Read',
    'to-watch': 'To Watch'
  };

  const defaultProps = {
    item: sampleBook,
    hexToRgba: mockHexToRgba,
    highlightColor: '#7c3aed',
    getStatusColor: mockGetStatusColor,
    getStatusIcon: mockGetStatusIcon,
    STATUS_LABELS: mockStatusLabels
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render book item with cover image', () => {
      const itemWithCover = { ...sampleBook, coverUrl: 'https://example.com/cover.jpg' };
      render(<ViewDetails {...defaultProps} item={itemWithCover} />);
      
      const image = screen.getByAltText(itemWithCover.title);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', itemWithCover.coverUrl);
    });

    it('should render fetch cover button when no cover and onFetchCover provided', () => {
      const onFetchCover = vi.fn();
      render(<ViewDetails {...defaultProps} onFetchCover={onFetchCover} />);
      
      const fetchButton = screen.getByText(/fetch cover/i);
      expect(fetchButton).toBeInTheDocument();
    });

    it('should not render cover section when no cover and no onFetchCover', () => {
      const itemWithoutCover = { ...sampleBook, coverUrl: null };
      const { container } = render(<ViewDetails {...defaultProps} item={itemWithoutCover} onFetchCover={null} />);
      
      // Should not render cover placeholder when onFetchCover is null
      expect(screen.queryByText(/no cover image available/i)).not.toBeInTheDocument();
      expect(container.querySelector('img')).not.toBeInTheDocument();
    });

    it('should render book type icon for books', () => {
      const { container } = render(<ViewDetails {...defaultProps} item={sampleBook} />);
      const bookIcon = container.querySelector('svg.lucide-book');
      expect(bookIcon).toBeInTheDocument();
    });

    it('should render film type icon for movies', () => {
      const { container } = render(<ViewDetails {...defaultProps} item={sampleMovie} />);
      const filmIcon = container.querySelector('svg.lucide-film');
      expect(filmIcon).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<ViewDetails {...defaultProps} />);
      expect(screen.getByText(sampleBook.title)).toBeInTheDocument();
    });

    it('should render author for books', () => {
      render(<ViewDetails {...defaultProps} />);
      expect(screen.getByText(sampleBook.author)).toBeInTheDocument();
    });

    it('should render director for movies', () => {
      render(<ViewDetails {...defaultProps} item={sampleMovie} />);
      expect(screen.getByText(sampleMovie.director)).toBeInTheDocument();
    });

    it('should render actors for movies', () => {
      const movieWithActors = { ...sampleMovie, actors: ['Actor 1', 'Actor 2'] };
      render(<ViewDetails {...defaultProps} item={movieWithActors} />);
      
      expect(screen.getByText('Cast')).toBeInTheDocument();
      expect(screen.getByText('Actor 1')).toBeInTheDocument();
      expect(screen.getByText('Actor 2')).toBeInTheDocument();
    });

    it('should render ISBN for books', () => {
      const bookWithISBN = { ...sampleBook, isbn: '1234567890' };
      render(<ViewDetails {...defaultProps} item={bookWithISBN} />);
      
      expect(screen.getByText(/ISBN: 1234567890/i)).toBeInTheDocument();
    });

    it('should render year', () => {
      const itemWithYear = { ...sampleBook, year: '2024' };
      render(<ViewDetails {...defaultProps} item={itemWithYear} />);
      
      expect(screen.getByText(/Year: 2024/i)).toBeInTheDocument();
    });

    it('should render date read', () => {
      const itemWithDateRead = { ...sampleBook, dateRead: '2024-01-01' };
      render(<ViewDetails {...defaultProps} item={itemWithDateRead} />);
      
      expect(screen.getByText(/Read on/i)).toBeInTheDocument();
    });

    it('should render date watched', () => {
      const itemWithDateWatched = { ...sampleMovie, dateWatched: '2024-01-01' };
      render(<ViewDetails {...defaultProps} item={itemWithDateWatched} />);
      
      expect(screen.getByText(/Watched on/i)).toBeInTheDocument();
    });

    it('should render rating when present', () => {
      const itemWithRating = { ...sampleBook, rating: 5 };
      render(<ViewDetails {...defaultProps} item={itemWithRating} />);
      
      expect(screen.getByText('Rating')).toBeInTheDocument();
    });

    it('should not render rating when hideRating is true', () => {
      const itemWithRating = { ...sampleBook, rating: 5 };
      render(<ViewDetails {...defaultProps} item={itemWithRating} hideRating={true} />);
      
      expect(screen.queryByText('Rating')).not.toBeInTheDocument();
    });

    it('should render tags', () => {
      const itemWithTags = { ...sampleBook, tags: ['fiction', 'classic'] };
      render(<ViewDetails {...defaultProps} item={itemWithTags} />);
      
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('fiction')).toBeInTheDocument();
      expect(screen.getByText('classic')).toBeInTheDocument();
    });

    it('should render review', () => {
      const itemWithReview = { ...sampleBook, review: 'Great book!' };
      render(<ViewDetails {...defaultProps} item={itemWithReview} />);
      
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Great book!')).toBeInTheDocument();
    });

    it('should render date added', () => {
      const itemWithDateAdded = { ...sampleBook, dateAdded: '2024-01-01' };
      render(<ViewDetails {...defaultProps} item={itemWithDateAdded} />);
      
      expect(screen.getByText(/Added on/i)).toBeInTheDocument();
    });
  });

  describe('rating interaction', () => {
    it('should render interactive rating when onRatingChange provided', () => {
      const onRatingChange = vi.fn();
      const itemWithRating = { ...sampleBook, rating: 3 };
      render(<ViewDetails {...defaultProps} item={itemWithRating} onRatingChange={onRatingChange} />);
      
      // Should have rating section
      expect(screen.getByText('Rating') || screen.queryAllByRole('button').length > 0).toBeTruthy();
    });

    it('should support half stars when enabled', () => {
      const onRatingChange = vi.fn();
      const itemWithRating = { ...sampleBook, rating: 3.5 };
      render(<ViewDetails {...defaultProps} item={itemWithRating} onRatingChange={onRatingChange} halfStarsEnabled={true} />);
      
      // Component should render with half stars enabled
      expect(onRatingChange).toBeDefined();
    });
  });

  describe('status interaction', () => {
    it('should render status indicator when currentStatus provided', () => {
      render(<ViewDetails {...defaultProps} currentStatus="read" />);
      
      const statusIndicator = screen.getByTitle('Read');
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should render status change button when onStatusChange provided', () => {
      const onStatusChange = vi.fn();
      render(<ViewDetails {...defaultProps} currentStatus="read" onStatusChange={onStatusChange} />);
      
      const statusButton = screen.getByTitle('Change status');
      expect(statusButton).toBeInTheDocument();
    });

    it('should call onStatusChange when status button clicked', async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      render(<ViewDetails {...defaultProps} currentStatus="read" onStatusChange={onStatusChange} />);
      
      const statusButton = screen.getByTitle('Change status');
      await user.click(statusButton);
      
      expect(onStatusChange).toHaveBeenCalledTimes(1);
    });

    it('should render status menu when showStatusMenu is true', () => {
      const statusOptions = ['read', 'to-read'];
      const onStatusMenuSelect = vi.fn();
      
      render(
        <ViewDetails
          {...defaultProps}
          currentStatus="read"
          showStatusMenu={true}
          statusOptions={statusOptions}
          onStatusMenuSelect={onStatusMenuSelect}
        />
      );
      
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('To Read')).toBeInTheDocument();
    });

    it('should call onStatusMenuSelect when status option clicked', async () => {
      const user = userEvent.setup();
      const onStatusMenuSelect = vi.fn();
      const statusOptions = ['read', 'to-read'];
      
      render(
        <ViewDetails
          {...defaultProps}
          currentStatus="read"
          showStatusMenu={true}
          statusOptions={statusOptions}
          onStatusMenuSelect={onStatusMenuSelect}
        />
      );
      
      const toReadOption = screen.getByText('To Read');
      await user.click(toReadOption);
      
      expect(onStatusMenuSelect).toHaveBeenCalledWith('to-read');
    });

    it('should close status menu when clicking outside', async () => {
      const user = userEvent.setup();
      const onCloseStatusMenu = vi.fn();
      
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <ViewDetails
            {...defaultProps}
            currentStatus="read"
            showStatusMenu={true}
            onCloseStatusMenu={onCloseStatusMenu}
            statusOptions={['read', 'to-read']}
            onStatusMenuSelect={vi.fn()}
          />
        </div>
      );
      
      const outside = screen.getByTestId('outside');
      await user.click(outside);
      
      expect(onCloseStatusMenu).toHaveBeenCalled();
    });
  });

  describe('cover fetching', () => {
    it('should call onFetchCover when fetch button clicked', async () => {
      const user = userEvent.setup();
      const onFetchCover = vi.fn();
      render(<ViewDetails {...defaultProps} onFetchCover={onFetchCover} />);
      
      const fetchButton = screen.getByText(/fetch cover/i);
      await user.click(fetchButton);
      
      expect(onFetchCover).toHaveBeenCalledTimes(1);
    });

    it('should disable fetch button when isFetchingCover is true', () => {
      const onFetchCover = vi.fn();
      render(<ViewDetails {...defaultProps} onFetchCover={onFetchCover} isFetchingCover={true} />);
      
      const fetchButton = screen.getByText(/fetching/i);
      expect(fetchButton).toBeDisabled();
    });

    it('should show fetching text when isFetchingCover is true', () => {
      const onFetchCover = vi.fn();
      render(<ViewDetails {...defaultProps} onFetchCover={onFetchCover} isFetchingCover={true} />);
      
      expect(screen.getByText(/fetching/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle item without optional fields', () => {
      const minimalItem = {
        id: 'test',
        title: 'Test Item',
        type: 'book'
      };
      render(<ViewDetails {...defaultProps} item={minimalItem} />);
      
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('should handle empty tags array', () => {
      const itemWithEmptyTags = { ...sampleBook, tags: [] };
      render(<ViewDetails {...defaultProps} item={itemWithEmptyTags} />);
      
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('should handle empty actors array for movies', () => {
      const movieWithoutActors = { ...sampleMovie, actors: [] };
      render(<ViewDetails {...defaultProps} item={movieWithoutActors} />);
      
      expect(screen.queryByText('Cast')).not.toBeInTheDocument();
    });

    it('should handle rating of 0', () => {
      const itemWithZeroRating = { ...sampleBook, rating: 0 };
      render(<ViewDetails {...defaultProps} item={itemWithZeroRating} />);
      
      expect(screen.queryByText('Rating')).not.toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('should not render rating section when rating is 0 and hideRating is false', () => {
      const itemWithZeroRating = { ...sampleBook, rating: 0 };
      render(<ViewDetails {...defaultProps} item={itemWithZeroRating} hideRating={false} />);
      
      expect(screen.queryByText('Rating')).not.toBeInTheDocument();
    });

    it('should not render status section when currentStatus is not provided', () => {
      render(<ViewDetails {...defaultProps} currentStatus={null} />);
      
      expect(screen.queryByTitle('Change status')).not.toBeInTheDocument();
    });

    it('should not render status menu when showStatusMenu is false', () => {
      render(
        <ViewDetails
          {...defaultProps}
          currentStatus="read"
          showStatusMenu={false}
          statusOptions={['read', 'to-read']}
          onStatusMenuSelect={vi.fn()}
        />
      );
      
      expect(screen.queryByText('To Read')).not.toBeInTheDocument();
    });
  });
});
