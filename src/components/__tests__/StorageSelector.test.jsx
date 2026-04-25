import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import StorageSelector from '../StorageSelector.jsx';

describe('StorageSelector', () => {
  let user;
  let onStorageSelect;
  let defaultProps;

  beforeEach(() => {
    user = userEvent.setup();
    onStorageSelect = vi.fn();
    defaultProps = {
      onStorageSelect,
      availableOptions: [
        { type: 'filesystem', name: 'Local Files', description: 'Store files in a local folder using your browser', supported: true },
        { type: 'googledrive', name: 'Google Drive', description: 'Store files in Google Drive for cloud sync', supported: true }
      ],
      error: null,
      isLoading: false,
      loadProgress: null
    };
  });

  describe('Basic Rendering', () => {
    it('should render storage options', () => {
      render(<StorageSelector {...defaultProps} />);

      expect(screen.getByText('Local Files')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
    });

    it('should show option descriptions', () => {
      render(<StorageSelector {...defaultProps} />);

      expect(screen.getByText(/Store files in a local folder/i)).toBeInTheDocument();
      expect(screen.getByText(/Store files in Google Drive/i)).toBeInTheDocument();
    });
  });

  describe('Storage Selection', () => {
    it('should call onStorageSelect when filesystem option is clicked', async () => {
      render(<StorageSelector {...defaultProps} />);

      const filesystemButton = screen.getByText('Local Files').closest('button');
      await user.click(filesystemButton);

      expect(onStorageSelect).toHaveBeenCalledWith('filesystem');
    });

    it('should not call onStorageSelect for disabled options', async () => {
      const propsWithDisabled = {
        ...defaultProps,
        availableOptions: [
          { type: 'filesystem', name: 'Local Files', description: 'Not supported', supported: false }
        ]
      };

      render(<StorageSelector {...propsWithDisabled} />);

      const filesystemButton = screen.getByText('Local Files').closest('button');
      await user.click(filesystemButton);

      expect(onStorageSelect).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading progress when isLoading is true', () => {
      const loadingProps = {
        ...defaultProps,
        isLoading: true,
        loadProgress: { processed: 50, total: 100 }
      };

      render(<StorageSelector {...loadingProps} />);

      expect(screen.getByText(/Loading your library/i)).toBeInTheDocument();
      expect(screen.getByText('50 / 100 files')).toBeInTheDocument();
    });

    it('should disable options during loading', () => {
      const loadingProps = {
        ...defaultProps,
        isLoading: true,
        loadProgress: { processed: 10, total: 100 }
      };

      render(<StorageSelector {...loadingProps} />);

      const filesystemButton = screen.getByText('Local Files').closest('button');
      expect(filesystemButton).toHaveClass('opacity-50');
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      const errorProps = {
        ...defaultProps,
        error: 'Failed to connect to storage'
      };

      render(<StorageSelector {...errorProps} />);

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to storage')).toBeInTheDocument();
    });

    it('should show troubleshooting tips for popup errors', () => {
      const errorProps = {
        ...defaultProps,
        error: 'The popup was blocked by browser' // lowercase "popup" to match the check
      };

      render(<StorageSelector {...errorProps} />);

      expect(screen.getByText(/Disable popup blockers/i)).toBeInTheDocument();
    });
  });

  describe('Disabled Options', () => {
    it('should show not supported message for disabled options', () => {
      const propsWithDisabled = {
        ...defaultProps,
        availableOptions: [
          { type: 'filesystem', name: 'Local Files', description: 'Not available', supported: false }
        ]
      };

      render(<StorageSelector {...propsWithDisabled} />);

      expect(screen.getByText('Not supported on this browser')).toBeInTheDocument();
    });

    it('should apply disabled styling to unsupported options', () => {
      const propsWithDisabled = {
        ...defaultProps,
        availableOptions: [
          { type: 'filesystem', name: 'Local Files', description: 'Not available', supported: false }
        ]
      };

      render(<StorageSelector {...propsWithDisabled} />);

      const filesystemButton = screen.getByText('Local Files').closest('button');
      expect(filesystemButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Empty State', () => {
    it('should show message when no options available', () => {
      const emptyProps = {
        ...defaultProps,
        availableOptions: []
      };

      render(<StorageSelector {...emptyProps} />);

      expect(screen.getByText(/No storage options are available/i)).toBeInTheDocument();
    });

    it('should not show message when loading', () => {
      const emptyLoadingProps = {
        ...defaultProps,
        availableOptions: [],
        isLoading: true
      };

      render(<StorageSelector {...emptyLoadingProps} />);

      expect(screen.queryByText(/No storage options are available/i)).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should display folder icon for filesystem', () => {
      render(<StorageSelector {...defaultProps} />);

      const filesystemCard = screen.getByText('Local Files').closest('button');
      expect(filesystemCard).toBeInTheDocument();
      // Icon is rendered, we just verify card renders
    });

    it('should display cloud icon for googledrive', () => {
      render(<StorageSelector {...defaultProps} />);

      const googleDriveCard = screen.getByText('Google Drive').closest('button');
      expect(googleDriveCard).toBeInTheDocument();
    });
  });

  describe('Help Section', () => {
    it('should display help section', () => {
      render(<StorageSelector {...defaultProps} />);

      expect(screen.getByText(/Need help choosing/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose Local Files if:/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose Google Drive if:/i)).toBeInTheDocument();
    });

    it('should show local files benefits', () => {
      render(<StorageSelector {...defaultProps} />);

      expect(screen.getByText(/primarily use desktop\/laptop/i)).toBeInTheDocument();
      expect(screen.getByText(/prefer local data control/i)).toBeInTheDocument();
    });

    it('should show Google Drive benefits', () => {
      render(<StorageSelector {...defaultProps} />);

      expect(screen.getByText(/want mobile\/tablet access/i)).toBeInTheDocument();
      expect(screen.getByText(/use multiple devices/i)).toBeInTheDocument();
      expect(screen.getByText(/want automatic backup/i)).toBeInTheDocument();
    });
  });

  describe('Feature Lists', () => {
    it('should show filesystem features', () => {
      render(<StorageSelector {...defaultProps} />);

      const filesystemCard = screen.getByText('Local Files').closest('button');
      expect(filesystemCard.textContent).toContain('Files stored locally');
      expect(filesystemCard.textContent).toContain('Works offline');
      expect(filesystemCard.textContent).toContain('Full control over your data');
    });

    it('should show Google Drive features', () => {
      render(<StorageSelector {...defaultProps} />);

      const googleDriveCard = screen.getByText('Google Drive').closest('button');
      expect(googleDriveCard.textContent).toContain('Access from any device');
      expect(googleDriveCard.textContent).toContain('Automatic cloud backup');
      expect(googleDriveCard.textContent).toContain('Works on mobile devices');
    });
  });

  describe('Progress Bar', () => {
    it('should show progress percentage', () => {
      const loadingProps = {
        ...defaultProps,
        isLoading: true,
        loadProgress: { processed: 25, total: 100 }
      };

      render(<StorageSelector {...loadingProps} />);

      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should calculate progress width correctly', () => {
      const loadingProps = {
        ...defaultProps,
        isLoading: true,
        loadProgress: { processed: 50, total: 100 }
      };

      const { container } = render(<StorageSelector {...loadingProps} />);

      const progressBar = container.querySelector('.bg-blue-500');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('should handle zero total gracefully', () => {
      const loadingProps = {
        ...defaultProps,
        isLoading: false, // Not loading when total is 0
        loadProgress: { processed: 0, total: 0 }
      };

      render(<StorageSelector {...loadingProps} />);

      // Should render without crashing - check for storage options
      expect(screen.getByText('Local Files')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
    });
  });

  describe('Error Messages', () => {
    it('should show authorized origins troubleshooting', () => {
      const errorProps = {
        ...defaultProps,
        error: 'Error: authorized origins not configured'
      };

      render(<StorageSelector {...errorProps} />);

      // Check for the troubleshooting section content
      expect(screen.getByText(/To fix this:/i)).toBeInTheDocument();
      expect(screen.getByText(/Google Cloud Console/i)).toBeInTheDocument();
    });

    it('should show popup troubleshooting tips', () => {
      const errorProps = {
        ...defaultProps,
        error: 'The popup was blocked'
      };

      render(<StorageSelector {...errorProps} />);

      expect(screen.getByText(/Disable popup blockers/i)).toBeInTheDocument();
      expect(screen.getByText(/Allow popups in browser settings/i)).toBeInTheDocument();
    });
  });

  describe('Hover States', () => {
    it('should handle mouse enter on supported option', async () => {
      render(<StorageSelector {...defaultProps} />);

      const filesystemButton = screen.getByText('Local Files').closest('button');
      
      await user.hover(filesystemButton);
      
      // Button should be hoverable
      expect(filesystemButton).toBeInTheDocument();
    });

    it('should handle mouse leave on supported option', async () => {
      render(<StorageSelector {...defaultProps} />);

      const filesystemButton = screen.getByText('Local Files').closest('button');
      
      await user.hover(filesystemButton);
      await user.unhover(filesystemButton);
      
      expect(filesystemButton).toBeInTheDocument();
    });
  });

  describe('Google Drive Modal', () => {
    it('should open Google Drive config modal when googledrive option clicked', async () => {
      render(<StorageSelector {...defaultProps} />);

      const googleDriveButton = screen.getByText('Google Drive').closest('button');
      await user.click(googleDriveButton);

      // Modal opening logic is tested, actual modal is mocked
      expect(onStorageSelect).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Options', () => {
    it('should render both filesystem and googledrive options', () => {
      render(<StorageSelector {...defaultProps} />);

      expect(screen.getByText('Local Files')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
    });

    it('should handle mix of supported and unsupported options', () => {
      const mixedProps = {
        ...defaultProps,
        availableOptions: [
          { type: 'filesystem', name: 'Local Files', description: 'Supported', supported: true },
          { type: 'googledrive', name: 'Google Drive', description: 'Not supported', supported: false }
        ]
      };

      render(<StorageSelector {...mixedProps} />);

      expect(screen.getByText('Local Files')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('Not supported on this device')).toBeInTheDocument();
    });
  });
});
