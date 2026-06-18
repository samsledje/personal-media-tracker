import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemCard from '../ItemCard.jsx';
import { sampleBook, sampleMovie, sampleBookUnrated } from '../../../test/fixtures/sampleItems.js';

describe('ItemCard', () => {
  const defaultProps = {
    item: sampleBook,
    cardSize: 'medium',
    highlightColor: '#7c3aed',
    selectionMode: false,
    selectedIds: new Set(),
    focusedId: null,
    onItemClick: vi.fn(),
    registerCardRef: vi.fn()
  };

  describe('rendering', () => {
    it('should render book item with all details', () => {
      render(<ItemCard {...defaultProps} />);
      
      expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      expect(screen.getByText('F. Scott Fitzgerald')).toBeInTheDocument();
      expect(screen.getByText('1925')).toBeInTheDocument();
    });

    it('should render movie item with director', () => {
      render(<ItemCard {...defaultProps} item={sampleMovie} />);
      
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText('The Wachowskis')).toBeInTheDocument();
      expect(screen.getByText('1999')).toBeInTheDocument();
    });

    it('should render without author/director', () => {
      const itemNoAuthor = { ...sampleBook, author: undefined };
      const props = { ...defaultProps, item: itemNoAuthor };
      render(<ItemCard {...props} />);
      
      expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      expect(screen.queryByText('F. Scott Fitzgerald')).not.toBeInTheDocument();
    });

    it('should render cover image when coverUrl is provided', () => {
      const itemWithCover = { ...sampleBook, coverUrl: 'https://example.com/cover.jpg' };
      const props = { ...defaultProps, item: itemWithCover };
      render(<ItemCard {...props} />);
      
      const img = screen.getByAltText('The Great Gatsby');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should render placeholder when no cover image', () => {
      render(<ItemCard {...defaultProps} />);
      
      // Should not have an img tag
      expect(screen.queryByAltText('The Great Gatsby')).not.toBeInTheDocument();
    });
  });

  describe('type icons', () => {
    it('should show book icon for book type', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      // Book icon should have blue color class
      const icon = container.querySelector('.text-blue-400');
      expect(icon).toBeInTheDocument();
    });

    it('should show film icon for movie type', () => {
      const props = { ...defaultProps, item: sampleMovie };
      const { container } = render(<ItemCard {...props} />);
      
      // Film icon should have purple color class
      const icon = container.querySelector('.text-purple-400');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('ratings', () => {
    it('should display star rating for rated items', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      // Should have 5 stars total
      const stars = container.querySelectorAll('.text-yellow-400, .text-slate-600');
      expect(stars.length).toBe(5);
      
      // sampleBook has rating of 5, so all should be filled
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      expect(filledStars.length).toBe(5);
    });

    it('should show partial star rating', () => {
      const itemRating3 = { ...sampleBook, rating: 3 };
      const props = { ...defaultProps, item: itemRating3 };
      const { container } = render(<ItemCard {...props} />);
      
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      expect(filledStars.length).toBe(3);
    });

    it('should not show stars for unrated items', () => {
      const props = { ...defaultProps, item: sampleBookUnrated };
      const { container } = render(<ItemCard {...props} />);
      
      const stars = container.querySelectorAll('.text-yellow-400');
      expect(stars.length).toBe(0);
    });

    it('should not show stars in tiny card size', () => {
      const props = { ...defaultProps, cardSize: 'tiny' };
      const { container } = render(<ItemCard {...props} />);
      
      const stars = container.querySelectorAll('.text-yellow-400');
      expect(stars.length).toBe(0);
    });
  });

  describe('tags', () => {
    it('should display up to 3 tags', () => {
      render(<ItemCard {...defaultProps} />);
      
      expect(screen.getByText('classic')).toBeInTheDocument();
      expect(screen.getByText('american-literature')).toBeInTheDocument();
    });

    it('should show +N indicator for more than 3 tags', () => {
      const itemManyTags = { 
        ...sampleBook, 
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] 
      };
      const props = { ...defaultProps, item: itemManyTags };
      render(<ItemCard {...props} />);
      
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should not show tags in tiny card size', () => {
      const props = { ...defaultProps, cardSize: 'tiny' };
      render(<ItemCard {...props} />);
      
      expect(screen.queryByText('classic')).not.toBeInTheDocument();
    });

    it('should not show tags when item has no tags', () => {
      const itemNoTags = { ...sampleBook, tags: [] };
      const props = { ...defaultProps, item: itemNoTags };
      render(<ItemCard {...props} />);
      
      expect(screen.queryByText('classic')).not.toBeInTheDocument();
    });
  });

  describe('status badge', () => {
    it('should display status badge with correct color', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      // sampleBook has status 'read' which should have green color
      const badge = container.querySelector('.bg-green-500');
      expect(badge).toBeInTheDocument();
    });

    it('should display status badge for different statuses', () => {
      const itemToRead = { ...sampleBook, status: 'to-read' };
      const props = { ...defaultProps, item: itemToRead };
      const { container } = render(<ItemCard {...props} />);
      
      // to-read should have blue color
      const badge = container.querySelector('.bg-blue-500');
      expect(badge).toBeInTheDocument();
    });

    it('should not render status badge when no status', () => {
      const itemNoStatus = { ...sampleBook, status: undefined };
      const props = { ...defaultProps, item: itemNoStatus };
      const { container } = render(<ItemCard {...props} />);
      
      const badge = container.querySelector('[title]');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('card sizes', () => {
    it('should apply tiny size classes', () => {
      const props = { ...defaultProps, cardSize: 'tiny' };
      const { container } = render(<ItemCard {...props} />);
      
      // Check for tiny-specific height class on cover
      const cover = container.querySelector('.h-24');
      expect(cover).toBeInTheDocument();
    });

    it('should apply small size classes', () => {
      const props = { ...defaultProps, cardSize: 'small' };
      const { container } = render(<ItemCard {...props} />);
      
      const cover = container.querySelector('.h-36');
      expect(cover).toBeInTheDocument();
    });

    it('should apply medium size classes (default)', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      const cover = container.querySelector('.h-40');
      expect(cover).toBeInTheDocument();
    });

    it('should apply large size classes', () => {
      const props = { ...defaultProps, cardSize: 'large' };
      const { container } = render(<ItemCard {...props} />);
      
      const cover = container.querySelector('.h-48');
      expect(cover).toBeInTheDocument();
    });

    it('should apply xlarge size classes', () => {
      const props = { ...defaultProps, cardSize: 'xlarge' };
      const { container } = render(<ItemCard {...props} />);
      
      const cover = container.querySelector('.h-64');
      expect(cover).toBeInTheDocument();
    });
  });

  describe('selection mode', () => {
    it('should show checkbox when in selection mode', () => {
      const props = { ...defaultProps, selectionMode: true };
      const { container } = render(<ItemCard {...props} />);
      
      const checkbox = container.querySelector('.absolute.top-2.left-2');
      expect(checkbox).toBeInTheDocument();
    });

    it('should not show checkbox when not in selection mode', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      const checkbox = container.querySelector('.absolute.top-2.left-2');
      expect(checkbox).not.toBeInTheDocument();
    });

    it('should show checked state when item is selected', () => {
      const selectedIds = new Set([sampleBook.id]);
      const props = { 
        ...defaultProps, 
        selectionMode: true,
        selectedIds
      };
      const { container } = render(<ItemCard {...props} />);
      
      const checkbox = container.querySelector('.bg-yellow-500');
      expect(checkbox).toBeInTheDocument();
      
      // Should have checkmark SVG
      const checkmark = container.querySelector('svg path');
      expect(checkmark).toBeInTheDocument();
    });

    it('should show unchecked state when item is not selected', () => {
      const props = { ...defaultProps, selectionMode: true };
      const { container } = render(<ItemCard {...props} />);
      
      const checkbox = container.querySelector('.bg-slate-800');
      expect(checkbox).toBeInTheDocument();
      
      // Should not have checkmark within the checkbox
      const checkboxContainer = container.querySelector('.absolute.top-2.left-2');
      const checkmark = checkboxContainer?.querySelector('svg.lucide-check');
      expect(checkmark).not.toBeInTheDocument();
    });
  });

  describe('focus state', () => {
    it('should apply focus ring when item is focused', () => {
      const props = { ...defaultProps, focusedId: sampleBook.id };
      const { container } = render(<ItemCard {...props} />);
      
      const card = container.querySelector('.ring-blue-500');
      expect(card).toBeInTheDocument();
    });

    it('should not apply focus ring when item is not focused', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      const card = container.querySelector('.ring-blue-500');
      expect(card).not.toBeInTheDocument();
    });

    it('should prioritize focus ring over selection ring', () => {
      const selectedIds = new Set([sampleBook.id]);
      const props = { 
        ...defaultProps, 
        selectionMode: true,
        selectedIds,
        focusedId: sampleBook.id
      };
      const { container } = render(<ItemCard {...props} />);
      
      // Should have blue focus ring, not yellow selection ring
      const focusRing = container.querySelector('.ring-blue-500');
      expect(focusRing).toBeInTheDocument();
      
      const selectionRing = container.querySelector('.ring-yellow-500');
      expect(selectionRing).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onItemClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      const props = { ...defaultProps, onItemClick };
      
      render(<ItemCard {...props} />);
      
      const card = screen.getByText('The Great Gatsby').closest('div').parentElement.parentElement;
      await user.click(card);
      
      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onItemClick).toHaveBeenCalledWith(sampleBook, expect.any(Object));
    });

    it('should register card ref on mount', () => {
      const registerCardRef = vi.fn();
      const props = { ...defaultProps, registerCardRef };
      
      render(<ItemCard {...props} />);
      
      expect(registerCardRef).toHaveBeenCalledWith(sampleBook.id, expect.any(HTMLElement));
    });

    it('should have cursor-pointer class for clickability', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      const card = container.querySelector('.cursor-pointer');
      expect(card).toBeInTheDocument();
    });
  });

  describe('year display', () => {
    it('should display year when provided', () => {
      render(<ItemCard {...defaultProps} />);
      
      expect(screen.getByText('1925')).toBeInTheDocument();
    });

    it('should not display year when not provided', () => {
      const itemNoYear = { ...sampleBook, year: undefined };
      const props = { ...defaultProps, item: itemNoYear };
      render(<ItemCard {...props} />);
      
      expect(screen.queryByText('1925')).not.toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should have displayName for debugging', () => {
      expect(ItemCard.displayName).toBe('ItemCard');
    });
  });

  describe('accessibility', () => {
    it('should have alt text for cover images', () => {
      const itemWithCover = { ...sampleBook, coverUrl: 'https://example.com/cover.jpg' };
      const props = { ...defaultProps, item: itemWithCover };
      render(<ItemCard {...props} />);
      
      const img = screen.getByAltText('The Great Gatsby');
      expect(img).toBeInTheDocument();
    });

    it('should have title attribute on status badge', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      const badge = container.querySelector('[title="Read"]');
      expect(badge).toBeInTheDocument();
    });

    it('should have aria-hidden on empty cover placeholder', () => {
      const { container } = render(<ItemCard {...defaultProps} />);
      
      const placeholder = container.querySelector('[aria-hidden="true"]');
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle item with no tags array', () => {
      const itemNoTagsArray = { ...sampleBook, tags: undefined };
      const props = { ...defaultProps, item: itemNoTagsArray };
      
      // Should not throw error
      expect(() => render(<ItemCard {...props} />)).not.toThrow();
    });

    it('should handle rating of 0', () => {
      const itemRating0 = { ...sampleBook, rating: 0 };
      const props = { ...defaultProps, item: itemRating0 };
      const { container } = render(<ItemCard {...props} />);
      
      // Should not show any stars
      const stars = container.querySelectorAll('.text-yellow-400');
      expect(stars.length).toBe(0);
    });

    it('should handle missing selectedIds set', () => {
      const props = { ...defaultProps, selectedIds: undefined, selectionMode: true };
      
      // Should not throw error
      expect(() => render(<ItemCard {...props} />)).not.toThrow();
    });

    it('should handle long titles with line-clamp', () => {
      const longTitle = 'This is a very long title that should be clamped to two lines maximum and not overflow the card';
      const itemLongTitle = { ...sampleBook, title: longTitle };
      const props = { ...defaultProps, item: itemLongTitle };
      const { container } = render(<ItemCard {...props} />);
      
      const title = container.querySelector('.line-clamp-2');
      expect(title).toBeInTheDocument();
      expect(title.textContent).toBe(longTitle);
    });
  });

  describe('accessibility', () => {
    it('should expose the card as a button with a descriptive label', () => {
      render(<ItemCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /The Great Gatsby/i });
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('F. Scott Fitzgerald'));
    });

    it('should reflect selection state via aria-pressed in selection mode', () => {
      const props = {
        ...defaultProps,
        selectionMode: true,
        selectedIds: new Set([sampleBook.id])
      };
      render(<ItemCard {...props} />);

      const card = screen.getByRole('button', { name: /The Great Gatsby/i });
      expect(card).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not set aria-pressed when not in selection mode', () => {
      render(<ItemCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /The Great Gatsby/i });
      expect(card).not.toHaveAttribute('aria-pressed');
    });
  });
});
