import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import StorageIndicator from '../StorageIndicator.jsx';

describe('StorageIndicator', () => {
  let user;
  let mockStorageAdapter;
  let onSwitchStorage;

  beforeEach(() => {
    user = userEvent.setup();
    onSwitchStorage = vi.fn();
    
    mockStorageAdapter = {
      isConnected: vi.fn(() => true),
      getStorageType: vi.fn(() => 'filesystem'),
      getStorageInfo: vi.fn(() => ({ account: null, folder: '/path/to/folder' }))
    };
  });

  describe('Rendering', () => {
    it('should not render if no storage adapter is provided', () => {
      const { container } = render(
        <StorageIndicator 
          storageAdapter={null} 
          storageInfo={null}
          onSwitchStorage={onSwitchStorage}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render indicator button when storage adapter exists', () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      expect(button).toBeInTheDocument();
    });

    it('should show FolderOpen icon for filesystem storage', () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const folderIcon = document.querySelector('.lucide-folder-open');
      expect(folderIcon).toBeInTheDocument();
    });

    it('should show Cloud icon for Google Drive storage', () => {
      mockStorageAdapter.getStorageType.mockReturnValue('googledrive');

      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="Google Drive: MarkdownMediaTracker"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const cloudIcon = document.querySelector('.lucide-cloud');
      expect(cloudIcon).toBeInTheDocument();
    });

    it('should show Wifi icon when connected', () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const wifiIcon = document.querySelector('.lucide-wifi');
      expect(wifiIcon).toBeInTheDocument();
    });

    it('should show WifiOff icon when disconnected', () => {
      mockStorageAdapter.isConnected.mockReturnValue(false);

      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo={null}
          onSwitchStorage={onSwitchStorage}
        />
      );

      const wifiOffIcon = document.querySelector('.lucide-wifi-off');
      expect(wifiOffIcon).toBeInTheDocument();
    });
  });

  describe('Panel Expansion', () => {
    it('should expand panel when indicator button is clicked', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      await user.click(button);

      expect(screen.getByText('Local Files')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should report open state changes via onOpenChange', async () => {
      const onOpenChange = vi.fn();
      render(
        <StorageIndicator
          storageAdapter={mockStorageAdapter}
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
          onOpenChange={onOpenChange}
        />
      );

      // Called with false on mount
      expect(onOpenChange).toHaveBeenLastCalledWith(false);

      await user.click(screen.getByTitle('Storage: Local Files'));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
    });

    it('should close panel when backdrop is clicked', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      await user.click(button);

      expect(screen.getByText('Local Files')).toBeInTheDocument();

      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();
      });
    });

    it('should toggle panel when indicator button is clicked again', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      
      // Open
      await user.click(button);
      expect(screen.getByText('Local Files')).toBeInTheDocument();

      // Close
      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();
      });
    });
  });

  describe('Panel Content', () => {
    it('should display storage type and location', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo={{ account: null, folder: '/path/to/folder' }}
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      await user.click(button);

      expect(screen.getByText('Local Files')).toBeInTheDocument();
      expect(screen.getByText('/path/to/folder')).toBeInTheDocument();
      expect(screen.getByText('Local Storage')).toBeInTheDocument();
    });

    it('should display Google Drive info correctly', async () => {
      mockStorageAdapter.getStorageType.mockReturnValue('googledrive');

      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo={{ account: 'test@example.com', folder: 'MarkdownMediaTracker' }}
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Google Drive');
      await user.click(button);

      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('MarkdownMediaTracker')).toBeInTheDocument();
      expect(screen.getByText('Cloud Storage')).toBeInTheDocument();
    });

    it('should show "Disconnected" status when not connected', async () => {
      mockStorageAdapter.isConnected.mockReturnValue(false);

      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo={null}
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Disconnected');
      await user.click(button);

      // Check for both "Disconnected" texts (title and status)
      const disconnectedTexts = screen.getAllByText('Disconnected');
      expect(disconnectedTexts.length).toBe(2);
      expect(screen.getByText('No storage connected')).toBeInTheDocument();
    });
  });

  describe('Switch Storage Action', () => {
    it('should call onSwitchStorage when Switch Storage button is clicked', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const indicatorButton = screen.getByTitle('Storage: Local Files');
      await user.click(indicatorButton);

      const switchButton = screen.getByText('Switch Storage');
      await user.click(switchButton);

      expect(onSwitchStorage).toHaveBeenCalledTimes(1);
    });

    it('should close panel after switching storage', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const indicatorButton = screen.getByTitle('Storage: Local Files');
      await user.click(indicatorButton);

      const switchButton = screen.getByText('Switch Storage');
      await user.click(switchButton);

      await waitFor(() => {
        expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close panel when Escape key is pressed', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      await user.click(button);

      expect(screen.getByText('Local Files')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();
      });
    });

    it('should switch storage when Cmd+Enter is pressed', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      await user.click(button);

      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(onSwitchStorage).toHaveBeenCalledTimes(1);
    });

    it('should switch storage when Ctrl+Enter is pressed', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      await user.click(button);

      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(onSwitchStorage).toHaveBeenCalledTimes(1);
    });

    it('should not register keyboard shortcuts when panel is closed', async () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      // Panel is closed, try keyboard shortcut
      await user.keyboard('{Control>}{Enter}{/Control}');

      // onSwitchStorage should not be called
      expect(onSwitchStorage).not.toHaveBeenCalled();
    });
  });

  describe('Imperative Handle Methods', () => {
    it('should expose openModal method via ref', () => {
      const ref = React.createRef();
      
      render(
        <StorageIndicator 
          ref={ref}
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      // Initially closed
      expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();

      // Call openModal
      act(() => {
        ref.current.openModal();
      });

      // Panel should be open
      expect(screen.getByText('Switch Storage')).toBeInTheDocument();
    });

    it('should expose closeModal method via ref', async () => {
      const ref = React.createRef();
      
      render(
        <StorageIndicator 
          ref={ref}
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      // Open modal
      act(() => {
        ref.current.openModal();
      });
      expect(screen.getByText('Switch Storage')).toBeInTheDocument();

      // Close modal
      act(() => {
        ref.current.closeModal();
      });

      // Panel should be closed
      await waitFor(() => {
        expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();
      });
    });

    it('should expose toggleModal method via ref', async () => {
      const ref = React.createRef();
      
      render(
        <StorageIndicator 
          ref={ref}
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      // Toggle open
      act(() => {
        ref.current.toggleModal();
      });
      expect(screen.getByText('Switch Storage')).toBeInTheDocument();

      // Toggle closed
      act(() => {
        ref.current.toggleModal();
      });

      await waitFor(() => {
        expect(screen.queryByText('Switch Storage')).not.toBeInTheDocument();
      });
    });

    it('should expose isOpen method via ref', () => {
      const ref = React.createRef();
      
      render(
        <StorageIndicator 
          ref={ref}
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      // Initially closed
      expect(ref.current.isOpen()).toBe(false);

      // Open it
      act(() => {
        ref.current.openModal();
      });
      expect(ref.current.isOpen()).toBe(true);

      // Close it
      act(() => {
        ref.current.closeModal();
      });
      expect(ref.current.isOpen()).toBe(false);
    });
  });

  describe('Visual States', () => {
    it('should apply green border when filesystem is connected', () => {
      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="/path/to/folder"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Local Files');
      expect(button).toHaveClass('border-green-500/30', 'bg-green-500/10');
    });

    it('should apply blue border when Google Drive is connected', () => {
      mockStorageAdapter.getStorageType.mockReturnValue('googledrive');

      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo="MarkdownMediaTracker"
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Google Drive');
      expect(button).toHaveClass('border-blue-500/30', 'bg-blue-500/10');
    });

    it('should apply red border when disconnected', () => {
      mockStorageAdapter.isConnected.mockReturnValue(false);

      render(
        <StorageIndicator 
          storageAdapter={mockStorageAdapter} 
          storageInfo={null}
          onSwitchStorage={onSwitchStorage}
        />
      );

      const button = screen.getByTitle('Storage: Disconnected');
      expect(button).toHaveClass('border-red-500/30', 'bg-red-500/10');
    });
  });
});
