import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyModal from '../ApiKeyModal.jsx';

// Mock config - must use vi.fn() directly in factory
vi.mock('../../../config.js', () => ({
  getConfig: vi.fn(() => ''),
  saveConfig: vi.fn(() => true),
  hasApiKey: vi.fn(() => false)
}));

// Import after mock
import { getConfig, saveConfig, hasApiKey } from '../../../config.js';

describe('ApiKeyModal', () => {
  const defaultProps = {
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue('');
    saveConfig.mockReturnValue(true);
    hasApiKey.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.getByText('API Key Management')).toBeInTheDocument();
    });

    it('should render API key input field', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('password');
    });

    it('should render save and cancel buttons', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should show welcome message when no API key exists', () => {
      getConfig.mockReturnValue('');
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.getByText(/Welcome to Markdown Media Tracker/i)).toBeInTheDocument();
    });

    it('should not show welcome message when API key exists', () => {
      getConfig.mockReturnValue('existing-key');
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.queryByText(/Welcome to Markdown Media Tracker/i)).not.toBeInTheDocument();
    });

    it('should load existing API key', () => {
      getConfig.mockReturnValue('existing-api-key-123');
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      expect(input.value).toBe('existing-api-key-123');
    });

    it('should show instructions for getting API key', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.getByText(/Don't have an API key/i)).toBeInTheDocument();
      expect(screen.getByText(/Visit/i)).toBeInTheDocument();
    });

    it('should have link to OMDb API website', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const link = screen.getByText('OMDb API');
      expect(link.closest('a')).toHaveAttribute('href', 'http://www.omdbapi.com/apikey.aspx');
      expect(link.closest('a')).toHaveAttribute('target', '_blank');
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<ApiKeyModal {...defaultProps} />);
      
      // Close button is an icon button without accessible name
      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ApiKeyModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<ApiKeyModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should update API key input value', async () => {
      const user = userEvent.setup();
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, 'new-api-key');
      
      expect(input.value).toBe('new-api-key');
    });

    it('should save API key when save button is clicked', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, 'test-api-key');
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(saveConfig).toHaveBeenCalledWith({ omdbApiKey: 'test-api-key' });
    });

    it('should trim API key before saving', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, '  test-api-key  ');
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(saveConfig).toHaveBeenCalledWith({ omdbApiKey: 'test-api-key' });
    });

    it('should save and close modal after successful save', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, 'test-api-key');
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/API key saved successfully/i)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should disable save button when input is empty', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('should disable save button when input is only whitespace', async () => {
      const user = userEvent.setup();
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, '   ');
      
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when input has value', async () => {
      const user = userEvent.setup();
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, 'test-key');
      
      const saveButton = screen.getByText('Save');
      expect(saveButton).not.toBeDisabled();
    });

    it('should save when Enter key is pressed with valid input', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, 'test-key');
      await user.keyboard('{Enter}');
      
      expect(saveConfig).toHaveBeenCalledWith({ omdbApiKey: 'test-key' });
    });

    it('should not save when Enter key is pressed with empty input', async () => {
      const user = userEvent.setup();
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.keyboard('{Enter}');
      
      expect(saveConfig).not.toHaveBeenCalled();
    });
  });

  describe('success message', () => {
    it('should show success message after saving', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      await user.type(input, 'test-key');
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/API key saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should hide success message after timeout', async () => {
      saveConfig.mockReturnValue(true);
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter your OMDb API key');
      const user = userEvent.setup();
      await user.type(input, 'test-key');
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText(/API key saved successfully/i)).toBeInTheDocument();
      });
      
      // Wait for modal to close after timeout (1500ms + buffer)
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });
});

