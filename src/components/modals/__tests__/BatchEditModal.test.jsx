import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import BatchEditModal from '../BatchEditModal';
import { STATUS_TYPES, STATUS_LABELS } from '../../../constants';
import * as toastService from '../../../services/toastService';

// Mock toast service
vi.mock('../../../services/toastService', () => ({
  toast: vi.fn(),
}));

describe('BatchEditModal', () => {
  const sampleBooks = [
    {
      id: '1',
      title: 'Book One',
      type: 'book',
      author: 'Author A',
      year: '2020',
      rating: 3,
      status: 'read',
      tags: ['fiction'],
      dateRead: '2024-01-01',
    },
    {
      id: '2',
      title: 'Book Two',
      type: 'book',
      author: 'Author B',
      year: '2021',
      rating: 4,
      status: 'to-read',
      tags: ['non-fiction'],
      dateRead: '',
    },
  ];

  const sampleMovies = [
    {
      id: '3',
      title: 'Movie One',
      type: 'movie',
      director: 'Director X',
      year: '2022',
      rating: 5,
      status: 'watched',
      tags: ['action'],
      dateWatched: '2024-02-01',
    },
  ];

  const defaultProps = {
    onClose: vi.fn(),
    onApply: vi.fn(),
    selectedItems: sampleBooks,
    isProcessing: false,
    progress: 0,
    total: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the modal with title', () => {
      render(<BatchEditModal {...defaultProps} />);
      expect(screen.getByText('Batch Edit Preview')).toBeInTheDocument();
    });

    it('should render close and apply buttons', () => {
      render(<BatchEditModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });

    it('should render all field checkboxes', () => {
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(10); // 10 fields with checkboxes
      
      // Verify field inputs exist
      expect(screen.getByPlaceholderText('Author')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Director')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Year')).toBeInTheDocument();
    });

    it('should render preview section', () => {
      render(<BatchEditModal {...defaultProps} />);
      expect(screen.getByText('Preview (before → after)')).toBeInTheDocument();
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
    });

    it('should show selected item count in button', () => {
      render(<BatchEditModal {...defaultProps} selectedItems={[sampleBooks[0]]} />);
      expect(screen.getByRole('button', { name: /apply to 1 items/i })).toBeInTheDocument();
    });
  });

  describe('Field Toggling', () => {
    it('should toggle type checkbox', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const typeCheckbox = checkboxes[0]; // First checkbox is type
      
      expect(typeCheckbox).not.toBeChecked();
      await user.click(typeCheckbox);
      expect(typeCheckbox).toBeChecked();
    });

    it('should toggle author checkbox', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const authorCheckbox = checkboxes[1]; // Second checkbox is author
      
      expect(authorCheckbox).not.toBeChecked();
      await user.click(authorCheckbox);
      expect(authorCheckbox).toBeChecked();
    });

    it('should toggle multiple checkboxes independently', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const typeCheckbox = checkboxes[0];
      const yearCheckbox = checkboxes[3];
      const ratingCheckbox = checkboxes[4];
      
      await user.click(typeCheckbox);
      await user.click(yearCheckbox);
      await user.click(ratingCheckbox);
      
      expect(typeCheckbox).toBeChecked();
      expect(yearCheckbox).toBeChecked();
      expect(ratingCheckbox).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked(); // author unchecked
    });
  });

  describe('Field Value Changes', () => {
    it('should update type value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.selectOptions(typeSelect, 'movie');
      
      expect(typeSelect.value).toBe('movie');
    });

    it('should update author value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const authorInput = screen.getByPlaceholderText('Author');
      await user.click(authorInput);
      await user.paste('New Author');
      
      expect(authorInput.value).toBe('New Author');
    });

    it('should update director value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const directorInput = screen.getByPlaceholderText('Director');
      await user.click(directorInput);
      await user.paste('New Director');
      
      expect(directorInput.value).toBe('New Director');
    });

    it('should update year value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const yearInput = screen.getByPlaceholderText('Year');
      await user.click(yearInput);
      await user.paste('2025');
      
      expect(yearInput.value).toBe('2025');
    });

    it('should update rating value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const ratingSelect = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(ratingSelect, '5');
      
      expect(ratingSelect.value).toBe('5');
    });

    it('should update status value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelect, 'reading');
      
      expect(statusSelect.value).toBe('reading');
    });

    it('should include DNF status option', async () => {
      render(<BatchEditModal {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      const options = Array.from(statusSelect.options).map(option => option.value);
      
      expect(options).toContain('dnf');
    });

    it('should update status to DNF', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelect, 'dnf');
      
      expect(statusSelect.value).toBe('dnf');
    });

    it('should update add tags value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const tagInputs = screen.getAllByPlaceholderText('tag1, tag2');
      const addTagsInput = tagInputs[0]; // First one is add tags
      await user.click(addTagsInput);
      await user.paste('new-tag, another-tag');
      
      expect(addTagsInput.value).toBe('new-tag, another-tag');
    });

    it('should update remove tags value', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const tagInputs = screen.getAllByPlaceholderText('tag1, tag2');
      const removeTagsInput = tagInputs[1]; // Second one is remove tags
      await user.click(removeTagsInput);
      await user.paste('old-tag');
      
      expect(removeTagsInput.value).toBe('old-tag');
    });

    it('should update date read value', async () => {
      const user = userEvent.setup();
      const { container } = render(<BatchEditModal {...defaultProps} />);
      
      const dateInputs = container.querySelectorAll('input[type="date"]');
      const dateReadInput = dateInputs[0]; // First date input is date read
      
      await user.click(dateReadInput);
      await user.paste('2025-03-15');
      expect(dateReadInput.value).toBe('2025-03-15');
    });

    it('should update date watched value', async () => {
      const user = userEvent.setup();
      const { container } = render(<BatchEditModal {...defaultProps} />);
      
      const dateInputs = container.querySelectorAll('input[type="date"]');
      const dateWatchedInput = dateInputs[1]; // Second date input is date watched
      
      await user.click(dateWatchedInput);
      await user.paste('2025-04-20');
      expect(dateWatchedInput.value).toBe('2025-04-20');
    });
  });

  describe('Validation', () => {
    it('should show error toast when no fields are selected', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);
      
      expect(toastService.toast).toHaveBeenCalledWith('No fields selected to apply', { type: 'error' });
      expect(defaultProps.onApply).not.toHaveBeenCalled();
    });

    it('should not show error when at least one field is selected', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const typeCheckbox = checkboxes[0];
      await user.click(typeCheckbox);
      
      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.selectOptions(typeSelect, 'movie');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);
      
      expect(toastService.toast).not.toHaveBeenCalledWith('No fields selected to apply', { type: 'error' });
      expect(defaultProps.onApply).toHaveBeenCalled();
    });
  });

  describe('Apply Functionality', () => {
    it('should call onApply with type change', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable type
      
      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.selectOptions(typeSelect, 'movie');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalledWith({ type: 'movie' });
    });

    it('should call onApply with author change', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Enable author

      const authorInput = screen.getByPlaceholderText('Author');
      await user.type(authorInput, 'Updated Author');

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      expect(defaultProps.onApply).toHaveBeenCalledWith({ author: 'Updated Author' });
    });

    it('should call onApply with rating change', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[4]); // Enable rating
      
      const ratingSelect = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(ratingSelect, '5');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalledWith({ rating: 5 });
    });

    it('should call onApply with multiple changes', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable type
      await user.click(checkboxes[4]); // Enable rating
      await user.click(checkboxes[5]); // Enable status

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.selectOptions(typeSelect, 'movie');

      const ratingSelect = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(ratingSelect, '4');

      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelect, 'watched');

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        type: 'movie',
        rating: 4,
        status: 'watched',
      });
    });

    it('should call onApply with add tags', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[6]); // Enable add tags

      const tagInputs = screen.getAllByPlaceholderText('tag1, tag2');
      await user.type(tagInputs[0], 'new-tag, another-tag');

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        addTags: ['new-tag', 'another-tag'],
      });
    });

    it('should call onApply with remove tags', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[7]); // Enable remove tags

      const tagInputs = screen.getAllByPlaceholderText('tag1, tag2');
      await user.type(tagInputs[1], 'old-tag');

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        removeTags: ['old-tag'],
      });
    });

    it('should trim and filter empty tags', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[6]); // Enable add tags

      const tagInputs = screen.getAllByPlaceholderText('tag1, tag2');
      await user.type(tagInputs[0], 'tag1,  , tag2,  ');

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        addTags: ['tag1', 'tag2'],
      });
    });

    it('should handle rating set to 0', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[4]); // Enable rating
      
      const ratingSelect = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(ratingSelect, '0');
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalledWith({ rating: 0 });
    });
  });

  describe('Preview', () => {
    it('should display before state for all items', () => {
      render(<BatchEditModal {...defaultProps} />);
      
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
      expect(screen.getByText(/Before: Author A • 2020 • 3★/)).toBeInTheDocument();
      expect(screen.getByText(/Before: Author B • 2021 • 4★/)).toBeInTheDocument();
    });

    it('should update preview when fields are changed', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Enable author

      const authorInput = screen.getByPlaceholderText('Author');
      await user.type(authorInput, 'New Author');

      // Preview should now show new author in "after" state
      expect(screen.getAllByText(/New Author/).length).toBeGreaterThan(0);
    });

    it('should show "Will change" indicator for modified items', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Enable author

      const authorInput = screen.getByPlaceholderText('Author');
      await user.type(authorInput, 'Changed Author');

      expect(screen.getAllByText('Will change').length).toBeGreaterThan(0);
    });

    it('should handle items with missing fields in preview', () => {
      const itemsWithMissing = [
        { id: '1', title: 'Minimal Book', type: 'book' },
        { id: '2', title: 'Minimal Movie', type: 'movie' },
      ];
      
      render(<BatchEditModal {...defaultProps} selectedItems={itemsWithMissing} />);
      
      expect(screen.getByText('Minimal Book')).toBeInTheDocument();
      expect(screen.getByText('Minimal Movie')).toBeInTheDocument();
      const beforeTexts = screen.getAllByText(/Before: - • - • -/);
      expect(beforeTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Processing State', () => {
    it('should show processing title when isProcessing is true', () => {
      render(<BatchEditModal {...defaultProps} isProcessing={true} progress={5} total={10} />);
      expect(screen.getByText('Updating Items...')).toBeInTheDocument();
    });

    it('should show progress bar when processing', () => {
      render(<BatchEditModal {...defaultProps} isProcessing={true} progress={3} total={10} />);
      expect(screen.getByText('Updating 3 of 10 items...')).toBeInTheDocument();
    });

    it('should hide close and apply buttons when processing', () => {
      render(<BatchEditModal {...defaultProps} isProcessing={true} />);
      
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
    });

    it('should hide form when processing', () => {
      render(<BatchEditModal {...defaultProps} isProcessing={true} />);
      
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBe(0);
    });

    it('should show correct progress percentage', () => {
      const { container } = render(<BatchEditModal {...defaultProps} isProcessing={true} progress={7} total={10} />);
      
      const progressBar = container.querySelector('[style*="width: 70%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close modal on Escape key', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should apply changes on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable type

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.selectOptions(typeSelect, 'movie');

      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(defaultProps.onApply).toHaveBeenCalledWith({ type: 'movie' });
    });

    it('should apply changes on Meta+Enter (Mac)', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Enable type

      const typeSelect = screen.getByRole('combobox', { name: /type/i });
      await user.selectOptions(typeSelect, 'movie');

      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(defaultProps.onApply).toHaveBeenCalledWith({ type: 'movie' });
    });

    it('should not apply when no fields selected via keyboard', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      expect(toastService.toast).toHaveBeenCalledWith('No fields selected to apply', { type: 'error' });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selectedItems array', () => {
      render(<BatchEditModal {...defaultProps} selectedItems={[]} />);
      expect(screen.getByRole('button', { name: /apply to 0 items/i })).toBeInTheDocument();
    });

    it('should handle single item selection', () => {
      render(<BatchEditModal {...defaultProps} selectedItems={[sampleBooks[0]]} />);
      expect(screen.getByRole('button', { name: /apply to 1 items/i })).toBeInTheDocument();
    });

    it('should handle mixed book and movie items', () => {
      const mixed = [...sampleBooks, ...sampleMovies];
      render(<BatchEditModal {...defaultProps} selectedItems={mixed} />);
      
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
      expect(screen.getByText('Movie One')).toBeInTheDocument();
    });

    it('should handle status dropdown with all status types', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      const options = Array.from(statusSelect.querySelectorAll('option')).map(opt => opt.value);
      
      // Should have book and movie statuses
      expect(options).toContain('to-read');
      expect(options).toContain('reading');
      expect(options).toContain('read');
      expect(options).toContain('to-watch');
      expect(options).toContain('watching');
      expect(options).toContain('watched');
      expect(options).toContain('dnf');
    });

    it('should handle empty string values for optional fields', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[3]); // Enable year
      
      // Leave year empty
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalledWith({ year: '' });
    });

    it('should handle tags with special characters', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[6]); // Enable add tags

      const tagInputs = screen.getAllByPlaceholderText('tag1, tag2');
      await user.type(tagInputs[0], 'sci-fi, c++, .net');

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(defaultProps.onApply).toHaveBeenCalledWith({
        addTags: ['sci-fi', 'c++', '.net'],
      });
    });

    it('should handle no changes in preview (identical before/after)', async () => {
      const user = userEvent.setup();
      render(<BatchEditModal {...defaultProps} />);
      
      // Don't enable any checkboxes or change values
      
      // Should not show "Will change" indicator
      expect(screen.queryByText('Will change')).not.toBeInTheDocument();
    });
  });
});
