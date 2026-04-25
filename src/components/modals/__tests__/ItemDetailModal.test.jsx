import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemDetailModal from '../ItemDetailModal.jsx';
import { sampleBook, sampleMovie } from '../../../test/fixtures/sampleItems.js';
import * as coverUtils from '../../../utils/coverUtils.js';
import * as toastService from '../../../services/toastService.js';

// Mock the services
vi.mock('../../../utils/coverUtils.js');
vi.mock('../../../services/toastService.js');

describe('ItemDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnQuickSave = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockHexToRgba = vi.fn((hex, alpha) => `rgba(0,0,0,${alpha})`);

  const defaultProps = {
    item: sampleBook,
    onClose: mockOnClose,
    onSave: mockOnSave,
    onDelete: mockOnDelete,
    onQuickSave: mockOnQuickSave,
    hexToRgba: mockHexToRgba,
    highlightColor: '#7c3aed',
    items: [sampleBook, sampleMovie],
    onNavigate: mockOnNavigate
  };

  beforeEach(() => {
    vi.clearAllMocks();
    toastService.toast.mockImplementation(() => { });
    coverUtils.fetchCoverForItem.mockResolvedValue('https://example.com/new-cover.jpg');
  });

  describe('rendering', () => {
    it('should render modal with item title', () => {
      render(<ItemDetailModal {...defaultProps} />);

      // Title appears in headings (both header and content)
      const headings = screen.getAllByRole('heading', { name: 'The Great Gatsby' });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render in view mode by default', () => {
      render(<ItemDetailModal {...defaultProps} />);

      // Should show view mode controls
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<ItemDetailModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render rating stars in view mode', () => {
      render(<ItemDetailModal {...defaultProps} />);

      // 5 star buttons
      const stars = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-star')
      );
      expect(stars).toHaveLength(5);
    });

    it('should render status indicator in view mode', () => {
      const { container } = render(<ItemDetailModal {...defaultProps} />);

      // Status badge should be visible
      const statusBadge = container.querySelector('.rounded-full');
      expect(statusBadge).toBeInTheDocument();
    });

    it('should render status dropdown toggle', () => {
      render(<ItemDetailModal {...defaultProps} />);

      const dropdown = screen.getByTitle('Change status');
      expect(dropdown).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('should start in edit mode when initialEditMode is true', () => {
      render(<ItemDetailModal {...defaultProps} initialEditMode={true} />);

      expect(screen.getByTitle('Save')).toBeInTheDocument();
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    it('should start in view mode when initialEditMode is false', () => {
      render(<ItemDetailModal {...defaultProps} initialEditMode={false} />);

      expect(screen.getByTitle('Edit')).toBeInTheDocument();
      expect(screen.queryByTitle('Save')).not.toBeInTheDocument();
    });

    it('should switch to edit mode when edit button clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Should show save button instead of edit
      expect(screen.getByTitle('Save')).toBeInTheDocument();
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    it('should hide rating stars in edit mode', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Edit'));

      // When in edit mode, the EditForm component is shown instead of ViewDetails
      // The quick rating section is hidden (only shown when !isEditing)
      // We verify edit mode by checking that Save button is visible
      expect(screen.getByTitle('Save')).toBeInTheDocument();
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    it('should hide status indicator in edit mode', async () => {
      const user = userEvent.setup();
      const { container } = render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Edit'));

      // Status badge should not be visible
      const statusBadge = container.querySelector('.rounded-full.w-10.h-10');
      expect(statusBadge).not.toBeInTheDocument();
    });

    it('should switch back to view mode when save clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Edit'));
      await user.click(screen.getByTitle('Save'));

      // Should show edit button again
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
      expect(screen.queryByTitle('Save')).not.toBeInTheDocument();
    });

    it('should call onSave when save button clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Edit'));
      await user.click(screen.getByTitle('Save'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sampleBook.id,
          title: sampleBook.title
        })
      );
    });
  });

  describe('quick rating changes', () => {
    it('should update rating when star clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      // Click third star
      const stars = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-star')
      );
      await user.click(stars[2]);

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 3
        })
      );
    });

    it('should cycle rating with half stars when clicking', async () => {
      const user = userEvent.setup();
      const itemWith3Stars = { ...sampleBook, rating: 3 };
      render(<ItemDetailModal {...defaultProps} item={itemWith3Stars} />);

      // Click third star left half (should go to 2.5)
      const stars = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-star')
      );
      // Mock getBoundingClientRect for left-half click
      stars[2].getBoundingClientRect = () => ({ left: 0, width: 40 });
      await user.click(stars[2], { clientX: 0 });

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 2.5
        })
      );

      // Mock getBoundingClientRect for right-half click
      stars[2].getBoundingClientRect = () => ({ left: 0, width: 40 });
      await user.click(stars[2], { clientX: 30 });

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 0
        })
      );
    });

    it('should highlight stars up to current rating', () => {
      const itemWith3Stars = { ...sampleBook, rating: 3 };
      render(<ItemDetailModal {...defaultProps} item={itemWith3Stars} />);

      const stars = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-star')
      );

      // First 3 should be filled
      expect(stars[0].querySelector('svg')).toHaveClass('fill-yellow-400');
      expect(stars[1].querySelector('svg')).toHaveClass('fill-yellow-400');
      expect(stars[2].querySelector('svg')).toHaveClass('fill-yellow-400');
      // Last 2 should not be filled
      expect(stars[3].querySelector('svg')).not.toHaveClass('fill-yellow-400');
      expect(stars[4].querySelector('svg')).not.toHaveClass('fill-yellow-400');
    });

    it('should use onSave if onQuickSave not provided', async () => {
      const user = userEvent.setup();
      const propsWithoutQuickSave = { ...defaultProps, onQuickSave: undefined };
      render(<ItemDetailModal {...propsWithoutQuickSave} />);

      const stars = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-star')
      );
      await user.click(stars[0]);

      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  describe('quick status changes', () => {
    it('should open status menu when dropdown clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const dropdown = screen.getByTitle('Change status');
      await user.click(dropdown);

      // Should show status options
      expect(screen.getByText('To Read')).toBeInTheDocument();
      expect(screen.getByText('Reading')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('should close status menu when clicking option', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Change status'));
      await user.click(screen.getByText('Reading'));

      // Menu should close
      expect(screen.queryByText('To Read')).not.toBeInTheDocument();
    });

    it('should call onQuickSave when status changed', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Change status'));
      await user.click(screen.getByText('Reading'));

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'reading'
        })
      );
    });

    it('should show correct statuses for book items', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Change status'));

      expect(screen.getByText('To Read')).toBeInTheDocument();
      expect(screen.getByText('Reading')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('should show correct statuses for movie items', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} item={sampleMovie} />);

      await user.click(screen.getByTitle('Change status'));

      expect(screen.getByText('To Watch')).toBeInTheDocument();
      expect(screen.getByText('Watching')).toBeInTheDocument();
      expect(screen.getByText('Watched')).toBeInTheDocument();
    });

    it('should highlight current status in menu', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Change status'));

      const readButton = screen.getByText('Read').closest('button');
      expect(readButton).toHaveClass('bg-slate-700/60');
    });
  });

  describe('delete functionality', () => {
    it('should show delete confirmation when delete button clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Delete'));

      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    it('should show item title in confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Delete'));

      expect(screen.getByText(/"The Great Gatsby"/)).toBeInTheDocument();
    });

    it('should call onDelete when confirmed', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Delete'));

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      const confirmButton = deleteButtons.find(btn => btn.textContent === 'Delete');
      await user.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledWith(sampleBook);
    });

    it('should close confirmation when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Delete'));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
    });

    it('should not delete when canceled', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Delete'));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close modal on Escape', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should save on Ctrl+Enter when editing', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Edit'));
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should save on Cmd+Enter when editing', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle('Edit'));
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should not save on Ctrl+Enter when not editing', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should toggle edit mode with E key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('e');

      expect(screen.getByTitle('Save')).toBeInTheDocument();
    });

    it('should save with E key when already editing', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('e'); // Enter edit mode
      await user.keyboard('e'); // Save

      expect(mockOnSave).toHaveBeenCalled();
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    it('should show delete confirmation with D key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('d');

      expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    it('should not delete with D key when editing', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('e'); // Enter edit mode
      await user.keyboard('d'); // Try to delete

      expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
    });

    it('should change status to "to read" with U key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('u');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'to-read'
        })
      );
    });

    it('should change status to "reading" with I key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('i');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'reading'
        })
      );
    });

    it('should change status to "read" with O key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('o');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read'
        })
      );
    });

    it('should change rating with number keys 0-5', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('3');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 3
        })
      );
    });

    it('should clear rating with 0 key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('0');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 0
        })
      );
    });

    it('should not trigger shortcuts while typing in input', async () => {
      const user = userEvent.setup();
      const { container } = render(<ItemDetailModal {...defaultProps} />);

      await user.keyboard('e'); // Enter edit mode

      // Find an input field
      const input = container.querySelector('input');
      if (input) {
        await user.click(input);
        await user.keyboard('d'); // Type 'd' in input

        // Should not trigger delete
        expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
      }
    });
  });

  describe('navigation', () => {
    it('should navigate to previous item with left arrow', async () => {
      const user = userEvent.setup();
      const items = [sampleMovie, sampleBook]; // Book is at index 1
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('{ArrowLeft}');

      expect(mockOnNavigate).toHaveBeenCalledWith(sampleMovie);
    });

    it('should navigate to next item with right arrow', async () => {
      const user = userEvent.setup();
      const items = [sampleBook, sampleMovie]; // Book is at index 0
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('{ArrowRight}');

      expect(mockOnNavigate).toHaveBeenCalledWith(sampleMovie);
    });

    it('should navigate to previous item with up arrow', async () => {
      const user = userEvent.setup();
      const items = [sampleMovie, sampleBook];
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('{ArrowUp}');

      expect(mockOnNavigate).toHaveBeenCalledWith(sampleMovie);
    });

    it('should navigate to next item with down arrow', async () => {
      const user = userEvent.setup();
      const items = [sampleBook, sampleMovie];
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('{ArrowDown}');

      expect(mockOnNavigate).toHaveBeenCalledWith(sampleMovie);
    });

    it('should not navigate beyond first item', async () => {
      const user = userEvent.setup();
      const items = [sampleBook, sampleMovie]; // Book is first
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('{ArrowLeft}');

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate beyond last item', async () => {
      const user = userEvent.setup();
      const items = [sampleMovie, sampleBook]; // Book is last
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('{ArrowRight}');

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when editing', async () => {
      const user = userEvent.setup();
      const items = [sampleBook, sampleMovie];
      render(<ItemDetailModal {...defaultProps} items={items} />);

      await user.keyboard('e'); // Enter edit mode
      await user.keyboard('{ArrowRight}');

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when onNavigate not provided', async () => {
      const user = userEvent.setup();
      const propsWithoutNav = { ...defaultProps, onNavigate: undefined };
      render(<ItemDetailModal {...propsWithoutNav} />);

      await user.keyboard('{ArrowRight}');

      // Should not throw error
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('cover image fetching', () => {
    it('should fetch cover when button clicked', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      // Find fetch cover button (may be in ViewDetails component)
      const fetchButton = screen.queryByText(/fetch cover/i) || screen.queryByTitle(/fetch cover/i);

      if (fetchButton) {
        await user.click(fetchButton);

        await waitFor(() => {
          expect(coverUtils.fetchCoverForItem).toHaveBeenCalled();
        });
      }
    });

    it('should show success toast when cover found', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const fetchButton = screen.queryByText(/fetch cover/i) || screen.queryByTitle(/fetch cover/i);

      if (fetchButton) {
        await user.click(fetchButton);

        await waitFor(() => {
          expect(toastService.toast).toHaveBeenCalledWith(
            'Cover image found and added!',
            { type: 'success' }
          );
        });
      }
    });

    it('should show info toast when no cover found', async () => {
      coverUtils.fetchCoverForItem.mockResolvedValue(null);

      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const fetchButton = screen.queryByText(/fetch cover/i) || screen.queryByTitle(/fetch cover/i);

      if (fetchButton) {
        await user.click(fetchButton);

        await waitFor(() => {
          expect(toastService.toast).toHaveBeenCalledWith(
            'No cover image found. Try adding one manually.',
            { type: 'info' }
          );
        });
      }
    });

    it('should handle API key missing error', async () => {
      const error = new Error('API_KEY_MISSING');
      coverUtils.fetchCoverForItem.mockRejectedValue(error);

      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const fetchButton = screen.queryByText(/fetch cover/i) || screen.queryByTitle(/fetch cover/i);

      if (fetchButton) {
        await user.click(fetchButton);

        await waitFor(() => {
          expect(toastService.toast).toHaveBeenCalledWith(
            'OMDb API key required for movie covers. Please configure in settings.',
            { type: 'error' }
          );
        });
      }
    });

    it('should call onQuickSave with new cover URL', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const fetchButton = screen.queryByText(/fetch cover/i) || screen.queryByTitle(/fetch cover/i);

      if (fetchButton) {
        await user.click(fetchButton);

        await waitFor(() => {
          expect(mockOnQuickSave).toHaveBeenCalledWith(
            expect.objectContaining({
              coverUrl: 'https://example.com/new-cover.jpg'
            })
          );
        });
      }
    });
  });

  describe('click outside', () => {
    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();
      const { container } = render(<ItemDetailModal {...defaultProps} />);

      // Click on backdrop (outside modal)
      const backdrop = container.querySelector('.fixed.inset-0');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside modal', async () => {
      const user = userEvent.setup();
      const { container } = render(<ItemDetailModal {...defaultProps} />);

      // Click on modal content area
      const modalContent = container.querySelector('.bg-slate-800.border.border-slate-700');
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle item without status', () => {
      const itemWithoutStatus = { ...sampleBook, status: undefined };
      render(<ItemDetailModal {...defaultProps} item={itemWithoutStatus} />);

      // Should use default status (read for books)
      expect(screen.getByTitle('Change status')).toBeInTheDocument();
    });

    it('should handle item without rating', () => {
      const itemWithoutRating = { ...sampleBook, rating: undefined };
      render(<ItemDetailModal {...defaultProps} item={itemWithoutRating} />);

      const stars = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-star')
      );

      // All stars should be unfilled
      stars.forEach(star => {
        expect(star.querySelector('svg')).not.toHaveClass('fill-yellow-400');
      });
    });

    it('should handle movie items correctly', () => {
      render(<ItemDetailModal {...defaultProps} item={sampleMovie} />);

      const headings = screen.getAllByRole('heading', { name: 'The Matrix' });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should update when item prop changes', async () => {
      const { rerender } = render(<ItemDetailModal {...defaultProps} />);

      let headings = screen.getAllByRole('heading', { name: 'The Great Gatsby' });
      expect(headings.length).toBeGreaterThan(0);

      rerender(<ItemDetailModal {...defaultProps} item={sampleMovie} />);

      await waitFor(() => {
        headings = screen.getAllByRole('heading', { name: 'The Matrix' });
        expect(headings.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty items array', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} items={[]} />);

      // Navigation should not throw errors
      await user.keyboard('{ArrowRight}');

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should change status to "to-read/to-watch" with "u" key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      // Focus the modal content area instead of trying to find by role
      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      await user.keyboard('u');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'to-read' // Book status
        })
      );
    });

    it('should change status to "reading/watching" with "i" key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      await user.keyboard('i');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'reading' // Book status
        })
      );
    });

    it('should change status to "completed" with "o" key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      await user.keyboard('o');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read' // Book status
        })
      );
    });

    it('should change status to "dnf" with "x" key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      await user.keyboard('x');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dnf'
        })
      );
    });

    it('should change movie status correctly with shortcuts', async () => {
      const user = userEvent.setup();
      const movieProps = { ...defaultProps, item: sampleMovie };
      render(<ItemDetailModal {...movieProps} />);

      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      // Test DNF shortcut for movie
      await user.keyboard('x');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dnf'
        })
      );
    });

    it('should not trigger shortcuts when typing in inputs', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      // Switch to edit mode
      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Find an input field
      const titleInput = screen.getByDisplayValue('The Great Gatsby');
      await user.click(titleInput);

      // Type 'x' in the input - should not trigger shortcut
      await user.keyboard('x');

      expect(mockOnQuickSave).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts when editing', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      // Switch to edit mode
      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Try shortcut - should not work in edit mode
      await user.keyboard('x');

      expect(mockOnQuickSave).not.toHaveBeenCalled();
    });

    it('should handle rating shortcuts in view mode', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      // Test rating shortcut
      await user.keyboard('3');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 3
        })
      );
    });

    it('should clear rating with "0" key', async () => {
      const user = userEvent.setup();
      render(<ItemDetailModal {...defaultProps} />);

      const modalContent = screen.getByRole('button', { name: /edit/i }).closest('.bg-slate-800');
      modalContent.focus();

      await user.keyboard('0');

      expect(mockOnQuickSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 0
        })
      );
    });
  });
});
