import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpModal from '../HelpModal.jsx';

describe('HelpModal', () => {
  const defaultProps = {
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<HelpModal {...defaultProps} />);
      
      // Close button is an icon button without accessible name
      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render global shortcuts section', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText('Global')).toBeInTheDocument();
      expect(screen.getByText(/Show\/hide this help/i)).toBeInTheDocument();
      // "Focus search" appears in multiple places, use getAllByText
      const focusSearchElements = screen.getAllByText(/Focus search/i);
      expect(focusSearchElements.length).toBeGreaterThan(0);
    });

    it('should render browsing shortcuts section', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText('When browsing items')).toBeInTheDocument();
      expect(screen.getByText(/Navigate between item cards/i)).toBeInTheDocument();
      expect(screen.getByText(/Open selected item/i)).toBeInTheDocument();
    });

    it('should render search modal shortcuts section', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText('In search modal')).toBeInTheDocument();
      // "Esc" appears in multiple places, use getAllByText
      const escElements = screen.getAllByText(/Esc/i);
      expect(escElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Switch to book search/i)).toBeInTheDocument();
    });

    it('should render item detail modal shortcuts section', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText('In item detail modal')).toBeInTheDocument();
      expect(screen.getByText(/Toggle edit mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Delete item/i)).toBeInTheDocument();
    });

    it('should display all major keyboard shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      // Check for key shortcuts (they appear in the text content)
      const content = document.body.textContent;
      expect(content).toContain('?');
      expect(content).toContain('/');
      expect(content).toContain('Esc');
      expect(content).toContain('T');
      expect(content).toContain('N');
      expect(content).toContain('S');
      expect(content).toContain('F');
      expect(content).toContain('C');
    });

    it('should display navigation shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      // "Arrow keys" appears in multiple places, use getAllByText
      const arrowKeysElements = screen.getAllByText(/Arrow keys/i);
      expect(arrowKeysElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/H\/J\/K\/L/i)).toBeInTheDocument();
    });

    it('should display selection mode shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText(/Toggle selection mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Select all visible/i)).toBeInTheDocument();
      expect(screen.getByText(/Delete selected/i)).toBeInTheDocument();
    });

    it('should display status change shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText(/To Read\/Watch status/i)).toBeInTheDocument();
      expect(screen.getByText(/Reading\/Watching status/i)).toBeInTheDocument();
      expect(screen.getByText(/Read\/Watched status/i)).toBeInTheDocument();
    });

    it('should display rating shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      expect(screen.getByText(/Set rating/i)).toBeInTheDocument();
      expect(screen.getByText(/0 = unrated/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<HelpModal {...defaultProps} />);
      
      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should be scrollable for long content', () => {
      render(<HelpModal {...defaultProps} />);
      
      const modal = screen.getByText('Keyboard shortcuts').closest('.overflow-y-auto');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should use grid layout for shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      const grid = screen.getByText('Global').closest('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have responsive grid columns', () => {
      render(<HelpModal {...defaultProps} />);
      
      const grid = screen.getByText('Global').closest('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });
  });

  describe('accessibility', () => {
    it('should have proper modal structure', () => {
      render(<HelpModal {...defaultProps} />);
      
      const modal = screen.getByText('Keyboard shortcuts').closest('.fixed');
      expect(modal).toBeInTheDocument();
    });

    it('should have semantic heading structure', () => {
      render(<HelpModal {...defaultProps} />);
      
      const h2 = screen.getByText('Keyboard shortcuts');
      expect(h2.tagName).toBe('H2');
      
      const h3s = screen.getAllByRole('heading', { level: 3 });
      expect(h3s.length).toBeGreaterThan(0);
    });

    it('should have list structure for shortcuts', () => {
      render(<HelpModal {...defaultProps} />);
      
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });
  });
});

