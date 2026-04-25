import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ObsidianBaseModal from '../ObsidianBaseModal.jsx';

describe('ObsidianBaseModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      expect(screen.getByText('Initialize Obsidian Base')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<ObsidianBaseModal {...defaultProps} />);
      
      // Close button is an icon button without accessible name
      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render information about Obsidian Base', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      expect(screen.getByText(/Create Obsidian Base File/i)).toBeInTheDocument();
      expect(screen.getByText(/Markdown Media Tracker.base/i)).toBeInTheDocument();
    });

    it('should render checkbox for "Don\'t ask me again"', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/Don't ask me again/i);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.type).toBe('checkbox');
    });

    it('should render cancel and create buttons', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('should have link to Obsidian Bases documentation', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const link = screen.getByText('Obsidian Bases');
      expect(link.closest('a')).toHaveAttribute('href', 'https://help.obsidian.md/bases');
      expect(link.closest('a')).toHaveAttribute('target', '_blank');
      expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<ObsidianBaseModal {...defaultProps} />);
      
      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<ObsidianBaseModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should toggle checkbox when clicked', async () => {
      const user = userEvent.setup();
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/Don't ask me again/i);
      expect(checkbox.checked).toBe(false);
      
      await user.click(checkbox);
      
      expect(checkbox.checked).toBe(true);
      
      await user.click(checkbox);
      
      expect(checkbox.checked).toBe(false);
    });

    it('should call onCreate when create button is clicked', async () => {
      const user = userEvent.setup();
      defaultProps.onCreate.mockResolvedValue(undefined);
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      expect(defaultProps.onCreate).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCreate).toHaveBeenCalledWith(false);
    });

    it('should pass dontAsk value to onCreate', async () => {
      const user = userEvent.setup();
      defaultProps.onCreate.mockResolvedValue(undefined);
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/Don't ask me again/i);
      await user.click(checkbox);
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      expect(defaultProps.onCreate).toHaveBeenCalledWith(true);
    });

    it('should disable create button while creating', async () => {
      const user = userEvent.setup();
      let resolveCreate;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      defaultProps.onCreate.mockReturnValue(createPromise);
      
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(createButton).toBeDisabled();
      });
      
      resolveCreate();
      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });
    });

    it('should handle onCreate error gracefully', async () => {
      const user = userEvent.setup();
      defaultProps.onCreate.mockRejectedValue(new Error('Create failed'));
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      // Should not throw, button should be re-enabled
      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper modal structure', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const modal = screen.getByText('Initialize Obsidian Base').closest('.fixed');
      expect(modal).toBeInTheDocument();
    });

    it('should have label for checkbox', () => {
      render(<ObsidianBaseModal {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/Don't ask me again/i);
      expect(checkbox).toBeInTheDocument();
    });
  });
});

