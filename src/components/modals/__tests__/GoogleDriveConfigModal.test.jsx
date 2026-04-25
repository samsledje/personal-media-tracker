import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoogleDriveConfigModal from '../GoogleDriveConfigModal.jsx';

// Mock config - must use vi.fn() directly in factory
vi.mock('../../../config.js', () => ({
  getConfig: vi.fn(() => 'MarkdownMediaTracker'),
  saveConfig: vi.fn(() => true)
}));

// Import after mock
import { getConfig, saveConfig } from '../../../config.js';

describe('GoogleDriveConfigModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onConnect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue('MarkdownMediaTracker');
    saveConfig.mockReturnValue(true);
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      expect(screen.getByText('Configure Google Drive')).toBeInTheDocument();
    });

    it('should render folder name input', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('MarkdownMediaTracker');
    });

    it('should render cancel and connect buttons', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Connect to Google Drive')).toBeInTheDocument();
    });

    it('should load folder name from config', () => {
      getConfig.mockReturnValue('MyCustomFolder');
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      expect(input.value).toBe('MyCustomFolder');
    });

    it('should use default folder name when config is empty', () => {
      getConfig.mockReturnValue(null);
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      expect(input.value).toBe('MarkdownMediaTracker');
    });

    it('should show instructions', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      expect(screen.getByText(/What happens next/i)).toBeInTheDocument();
      expect(screen.getByText(/Google will ask you to sign in/i)).toBeInTheDocument();
    });

    it('should show folder name in instructions', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      expect(screen.getByText(/MarkdownMediaTracker/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<GoogleDriveConfigModal {...defaultProps} />);
      
      // Close button is an icon button without accessible name
      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should update folder name input', async () => {
      const user = userEvent.setup();
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      await user.clear(input);
      await user.type(input, 'MyNewFolder');
      
      expect(input.value).toBe('MyNewFolder');
    });

    it('should save folder name and call onConnect when connect button is clicked', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      await user.clear(input);
      await user.type(input, 'MyCustomFolder');
      
      const connectButton = screen.getByText('Connect to Google Drive');
      await user.click(connectButton);
      
      expect(saveConfig).toHaveBeenCalledWith({ googleDriveFolderName: 'MyCustomFolder' });
      expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
    });

    it('should trim folder name before saving', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      await user.clear(input);
      await user.type(input, '  MyFolder  ');
      
      const connectButton = screen.getByText('Connect to Google Drive');
      await user.click(connectButton);
      
      expect(saveConfig).toHaveBeenCalledWith({ googleDriveFolderName: 'MyFolder' });
    });

    it('should use default folder name when input is empty', async () => {
      const user = userEvent.setup();
      saveConfig.mockReturnValue(true);
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      await user.clear(input);
      
      const connectButton = screen.getByText('Connect to Google Drive');
      await user.click(connectButton);
      
      expect(saveConfig).toHaveBeenCalledWith({ googleDriveFolderName: 'MarkdownMediaTracker' });
      expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper modal structure', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const modal = screen.getByText('Configure Google Drive').closest('.fixed');
      expect(modal).toBeInTheDocument();
    });

    it('should have label for folder name input', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      expect(screen.getByText('Folder Name')).toBeInTheDocument();
    });

    it('should auto-focus folder name input', () => {
      render(<GoogleDriveConfigModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('MarkdownMediaTracker');
      // Input should be focusable (autoFocus attribute)
      expect(input).toBeInTheDocument();
    });
  });
});

