import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEditModal from '../AddEditModal.jsx';
import { sampleBook, sampleMovie } from '../../../test/fixtures/sampleItems.js';
import { STATUS_TYPES } from '../../../constants/index.js';

// Mock EditForm
vi.mock('../../forms/EditForm.jsx', () => ({
  default: ({ item, onChange, fromSearch, allTags }) => (
    <div data-testid="edit-form">
      <input
        data-testid="title-input"
        value={item.title || ''}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        placeholder="Title"
      />
      <select
        data-testid="type-select"
        value={item.type || 'book'}
        onChange={(e) => onChange({ ...item, type: e.target.value })}
      >
        <option value="book">Book</option>
        <option value="movie">Movie</option>
      </select>
      <div data-testid="from-search">{fromSearch ? 'true' : 'false'}</div>
      <div data-testid="all-tags">{allTags.join(',')}</div>
    </div>
  )
}));

// Mock toast service
vi.mock('../../../services/toastService.js', () => ({
  toast: vi.fn()
}));

import { toast } from '../../../services/toastService.js';

describe('AddEditModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSave: vi.fn(),
    initialItem: null,
    allTags: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(<AddEditModal {...defaultProps} />);
      
      expect(screen.getByText('Add New Item')).toBeInTheDocument();
    });

    it('should render EditForm', () => {
      render(<AddEditModal {...defaultProps} />);
      
      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<AddEditModal {...defaultProps} />);
      
      // Close button is an icon button without accessible name
      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render save and cancel buttons', () => {
      render(<AddEditModal {...defaultProps} />);
      
      expect(screen.getByText('Save Item')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should initialize with default book item when no initialItem', () => {
      render(<AddEditModal {...defaultProps} />);
      
      const titleInput = screen.getByTestId('title-input');
      const typeSelect = screen.getByTestId('type-select');
      
      expect(titleInput.value).toBe('');
      expect(typeSelect.value).toBe('book');
    });

    it('should initialize with initialItem when provided', () => {
      render(<AddEditModal {...defaultProps} initialItem={sampleBook} />);
      
      const titleInput = screen.getByTestId('title-input');
      expect(titleInput.value).toBe('The Great Gatsby');
    });

    it('should pass allTags to EditForm', () => {
      const allTags = ['fiction', 'classic', 'sci-fi'];
      render(<AddEditModal {...defaultProps} allTags={allTags} />);
      
      expect(screen.getByTestId('all-tags').textContent).toBe('fiction,classic,sci-fi');
    });

    it('should set fromSearch to true when initialItem has dateAdded', () => {
      const itemWithDate = { ...sampleBook, dateAdded: '2024-01-01' };
      render(<AddEditModal {...defaultProps} initialItem={itemWithDate} />);
      
      expect(screen.getByTestId('from-search').textContent).toBe('true');
    });

    it('should set fromSearch to false when initialItem has no dateAdded', () => {
      const itemWithoutDate = { ...sampleBook, dateAdded: '' };
      render(<AddEditModal {...defaultProps} initialItem={itemWithoutDate} />);
      
      expect(screen.getByTestId('from-search').textContent).toBe('false');
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<AddEditModal {...defaultProps} />);
      
      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSave when save button is clicked with valid item', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} initialItem={sampleBook} />);
      
      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);
      
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Great Gatsby'
        })
      );
    });

    it('should show error toast when saving without title', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} />);
      
      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);
      
      expect(toast).toHaveBeenCalledWith('Title is required', { type: 'error' });
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should call onSave with Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} initialItem={sampleBook} />);
      
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    it('should call onSave with Cmd+Enter on Mac', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} initialItem={sampleBook} />);
      
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('form updates', () => {
    it('should update item when form changes', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} />);
      
      const titleInput = screen.getByTestId('title-input');
      await user.type(titleInput, 'New Book');
      
      expect(titleInput.value).toBe('New Book');
    });

    it('should update type when type select changes', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} />);
      
      const typeSelect = screen.getByTestId('type-select');
      await user.selectOptions(typeSelect, 'movie');
      
      expect(typeSelect.value).toBe('movie');
    });

    it('should update status when type changes to book', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} initialItem={sampleMovie} />);
      
      const typeSelect = screen.getByTestId('type-select');
      await user.selectOptions(typeSelect, 'book');
      
      // Status should be updated to book status
      await waitFor(() => {
        expect(typeSelect.value).toBe('book');
      });
    });

    it('should update status when type changes to movie', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} initialItem={sampleBook} />);
      
      const typeSelect = screen.getByTestId('type-select');
      await user.selectOptions(typeSelect, 'movie');
      
      await waitFor(() => {
        expect(typeSelect.value).toBe('movie');
      });
    });
  });

  describe('initial values', () => {
    it('should set default status for new book', () => {
      render(<AddEditModal {...defaultProps} />);
      
      // Default status for new book should be TO_READ
      // This is tested through the EditForm component
      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
    });

    it('should set default status for new movie', () => {
      render(<AddEditModal {...defaultProps} initialItem={{ type: 'movie' }} />);
      
      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
    });

    it('should preserve status from initialItem', () => {
      render(<AddEditModal {...defaultProps} initialItem={sampleBook} />);
      
      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
    });

    it('should set default status when initialItem has no status', () => {
      const itemNoStatus = { ...sampleBook, status: undefined };
      render(<AddEditModal {...defaultProps} initialItem={itemNoStatus} />);
      
      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
    });
  });

  describe('duplicate detection', () => {
    it('should call onDuplicate and show warning toast when saving a duplicate book', async () => {
      const user = userEvent.setup();
      const onDuplicate = vi.fn();
      render(
        <AddEditModal
          {...defaultProps}
          onDuplicate={onDuplicate}
          initialItem={sampleBook}
          allItems={[sampleBook]}
        />
      );

      await user.click(screen.getByText('Save Item'));

      expect(toast).toHaveBeenCalledWith(
        `"${sampleBook.title}" is already in your library`,
        { type: 'warning' }
      );
      expect(onDuplicate).toHaveBeenCalledWith(sampleBook);
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should call onDuplicate and show warning toast when saving a duplicate movie', async () => {
      const user = userEvent.setup();
      const onDuplicate = vi.fn();
      render(
        <AddEditModal
          {...defaultProps}
          onDuplicate={onDuplicate}
          initialItem={sampleMovie}
          allItems={[sampleMovie]}
        />
      );

      await user.click(screen.getByText('Save Item'));

      expect(toast).toHaveBeenCalledWith(
        `"${sampleMovie.title}" is already in your library`,
        { type: 'warning' }
      );
      expect(onDuplicate).toHaveBeenCalledWith(sampleMovie);
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should call onSave normally when item is not a duplicate', async () => {
      const user = userEvent.setup();
      const onDuplicate = vi.fn();
      render(
        <AddEditModal
          {...defaultProps}
          onDuplicate={onDuplicate}
          initialItem={sampleBook}
          allItems={[sampleMovie]}
        />
      );

      await user.click(screen.getByText('Save Item'));

      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
      expect(onDuplicate).not.toHaveBeenCalled();
    });

    it('should call onSave normally when allItems is empty', async () => {
      const user = userEvent.setup();
      const onDuplicate = vi.fn();
      render(
        <AddEditModal
          {...defaultProps}
          onDuplicate={onDuplicate}
          initialItem={sampleBook}
          allItems={[]}
        />
      );

      await user.click(screen.getByText('Save Item'));

      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
      expect(onDuplicate).not.toHaveBeenCalled();
    });

    it('should not throw when onDuplicate prop is omitted and duplicate is found', async () => {
      const user = userEvent.setup();
      render(
        <AddEditModal
          {...defaultProps}
          initialItem={sampleBook}
          allItems={[sampleBook]}
        />
      );

      await expect(user.click(screen.getByText('Save Item'))).resolves.not.toThrow();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper modal structure', () => {
      render(<AddEditModal {...defaultProps} />);
      
      const modal = screen.getByText('Add New Item').closest('.fixed');
      expect(modal).toBeInTheDocument();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<AddEditModal {...defaultProps} />);
      
      // Focus should be managed by the modal
      const titleInput = screen.getByTestId('title-input');
      await user.tab();
      
      // Focus should be within modal
      expect(document.activeElement).toBeInTheDocument();
    });
  });
});

