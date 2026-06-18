import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../ToastProvider.jsx';
import { useToast } from '../../hooks/useToast.js';
import * as toastService from '../../services/toastService.js';

// Mock toastService
vi.mock('../../services/toastService.js', () => ({
  registerToast: vi.fn()
}));

// Test component that uses the toast hook
const TestComponent = ({ onShow, onHide, toastIdToHide }) => {
  const { show, hide } = useToast();
  
  return (
    <div>
      <button onClick={() => {
        const id = show('Test message');
        onShow?.(id);
      }}>
        Show Toast
      </button>
      <button onClick={() => {
        const id = show('Success message', { type: 'success' });
        onShow?.(id);
      }}>
        Show Success
      </button>
      <button onClick={() => {
        const id = show('Error message', { type: 'error' });
        onShow?.(id);
      }}>
        Show Error
      </button>
      <button onClick={() => {
        const id = show('Persistent toast', { timeout: 0 });
        onShow?.(id);
      }}>
        Show Persistent
      </button>
      <button onClick={() => {
        if (toastIdToHide !== undefined) {
          hide(toastIdToHide);
        }
      }}>
        Hide Toast
      </button>
    </div>
  );
};

describe('ToastProvider', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Child content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should register with toast service on mount', () => {
      render(<ToastProvider><div /></ToastProvider>);

      expect(toastService.registerToast).toHaveBeenCalled();
    });

    it('should unregister from toast service on unmount', () => {
      const { unmount } = render(<ToastProvider><div /></ToastProvider>);

      unmount();

      // Should have been called twice - once on mount, once on unmount with null
      expect(toastService.registerToast).toHaveBeenCalledWith(null);
    });
  });

  describe('Showing Toasts', () => {
    it('should show a toast with default options', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByText('Show Toast');
      await user.click(showButton);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should show success toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByText('Show Success');
      await user.click(showButton);

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should show error toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByText('Show Error');
      await user.click(showButton);

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should show multiple toasts simultaneously', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  describe('Hiding Toasts', () => {
    it('should hide toast when clicked', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      const toast = screen.getByText('Test message');
      
      await user.click(toast);

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });

    it('should hide specific toast by ID', async () => {
      let toastId;
      const onShow = (id) => { toastId = id; };

      const { rerender } = render(
        <ToastProvider>
          <TestComponent onShow={onShow} toastIdToHide={toastId} />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Re-render with the captured toast ID
      rerender(
        <ToastProvider>
          <TestComponent onShow={onShow} toastIdToHide={toastId} />
        </ToastProvider>
      );

      await user.click(screen.getByText('Hide Toast'));

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for accessibility', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      const toast = screen.getByText('Test message').closest('[role="status"]');
      expect(toast).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply error styling for error toasts', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Error'));

      const toast = screen.getByText('Error message');
      expect(toast).toHaveStyle({ backgroundColor: 'rgba(220,38,38,0.92)' });
    });
  });
});
