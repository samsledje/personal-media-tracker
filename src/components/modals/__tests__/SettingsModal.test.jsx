import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsModal from '../SettingsModal.jsx';

const defaultProps = {
  onClose: vi.fn(),
  initialTab: 'Appearance',
  primaryColor: '#0b1220',
  highlightColor: '#7c3aed',
  cardSize: 'medium',
  updatePrimaryColor: vi.fn(),
  updateHighlightColor: vi.fn(),
  updateCardSize: vi.fn(),
  resetTheme: vi.fn(),
  halfStarsEnabled: true,
  setHalfStarsEnabled: vi.fn(),
  storageAdapter: null,
  onClearCache: vi.fn(),
  omdbApiKey: '',
  updateApiKey: vi.fn(),
  tmdbApiKey: '',
  updateTmdbApiKey: vi.fn(),
};

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with Appearance tab active by default', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText('Card Size: Medium')).toBeInTheDocument();
    expect(screen.getByText('Primary Color')).toBeInTheDocument();
    expect(screen.getByText('Highlight Color')).toBeInTheDocument();
  });

  it('renders on the specified initialTab', () => {
    render(<SettingsModal {...defaultProps} initialTab="General" />);
    expect(screen.getByText('Half Star Ratings')).toBeInTheDocument();
  });

  it('switches tabs when clicked', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByText('Half Star Ratings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('API Keys'));
    expect(screen.getByText('OMDb API Key')).toBeInTheDocument();
  });

  it('calls onClose when X is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close settings/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<SettingsModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls updateCardSize when slider changes', () => {
    render(<SettingsModal {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(defaultProps.updateCardSize).toHaveBeenCalledWith('xlarge');
  });

  it('calls resetTheme when reset button clicked', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Reset to defaults'));
    expect(defaultProps.resetTheme).toHaveBeenCalled();
  });

  it('calls setHalfStarsEnabled when toggle clicked', () => {
    render(<SettingsModal {...defaultProps} initialTab="General" />);
    fireEvent.click(screen.getByLabelText('Toggle half star ratings'));
    expect(defaultProps.setHalfStarsEnabled).toHaveBeenCalledWith(false);
  });

  it('does not show Clear Cache button for filesystem storage', () => {
    const fsAdapter = { getStorageType: () => 'filesystem' };
    render(<SettingsModal {...defaultProps} initialTab="General" storageAdapter={fsAdapter} />);
    expect(screen.queryByText('Clear Cache')).not.toBeInTheDocument();
  });

  it('shows Clear Cache button for Google Drive storage', () => {
    const gdriveAdapter = { getStorageType: () => 'googledrive' };
    render(<SettingsModal {...defaultProps} initialTab="General" storageAdapter={gdriveAdapter} />);
    expect(screen.getByText('Clear Cache')).toBeInTheDocument();
  });

  it('calls updateApiKey and shows saved message when Save Key clicked', async () => {
    render(<SettingsModal {...defaultProps} initialTab="API Keys" />);
    const input = screen.getByPlaceholderText('Enter your OMDb API key');
    fireEvent.change(input, { target: { value: 'my-key-123' } });
    fireEvent.click(screen.getByText('Save Key'));
    expect(defaultProps.updateApiKey).toHaveBeenCalledWith('my-key-123');
    expect(screen.getByText('✓ API key saved')).toBeInTheDocument();
  });

  it('shows welcome message when no API key is set', () => {
    render(<SettingsModal {...defaultProps} initialTab="API Keys" omdbApiKey="" />);
    expect(screen.getByText('Movie search requires an API key')).toBeInTheDocument();
  });

  it('does not show welcome message when API key is set', () => {
    render(<SettingsModal {...defaultProps} initialTab="API Keys" omdbApiKey="existing-key" />);
    expect(screen.queryByText('Movie search requires an API key')).not.toBeInTheDocument();
  });

  it('hides saved message after 2 seconds', () => {
    render(<SettingsModal {...defaultProps} initialTab="API Keys" />);
    const input = screen.getByPlaceholderText('Enter your OMDb API key');
    fireEvent.change(input, { target: { value: 'my-key' } });
    fireEvent.click(screen.getByText('Save Key'));
    expect(screen.getByText('✓ API key saved')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('✓ API key saved')).not.toBeInTheDocument();
  });

  it('saves API key on Enter key in input', () => {
    const updateApiKey = vi.fn();
    render(<SettingsModal {...defaultProps} initialTab="API Keys" updateApiKey={updateApiKey} />);
    const input = screen.getByPlaceholderText('Enter your OMDb API key');
    fireEvent.change(input, { target: { value: 'enter-key' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateApiKey).toHaveBeenCalledWith('enter-key');
  });

  it('calls updatePrimaryColor when a color preset is clicked', () => {
    const updatePrimaryColor = vi.fn();
    render(<SettingsModal {...defaultProps} updatePrimaryColor={updatePrimaryColor} />);
    const presetButtons = screen.getAllByTitle(/Primary preset/);
    fireEvent.click(presetButtons[0]);
    expect(updatePrimaryColor).toHaveBeenCalled();
  });

  it('calls updateHighlightColor when a highlight preset is clicked', () => {
    const updateHighlightColor = vi.fn();
    render(<SettingsModal {...defaultProps} updateHighlightColor={updateHighlightColor} />);
    const presetButtons = screen.getAllByTitle(/Highlight preset/);
    fireEvent.click(presetButtons[0]);
    expect(updateHighlightColor).toHaveBeenCalled();
  });

  it('calls onClearCache and onClose when Clear Cache is clicked', () => {
    const onClearCache = vi.fn();
    const onClose = vi.fn();
    const gdriveAdapter = { getStorageType: () => 'googledrive' };
    render(<SettingsModal {...defaultProps} initialTab="General" storageAdapter={gdriveAdapter} onClearCache={onClearCache} onClose={onClose} />);
    fireEvent.click(screen.getByText('Clear Cache'));
    expect(onClearCache).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('updates active tab when initialTab prop changes', () => {
    const { rerender } = render(<SettingsModal {...defaultProps} initialTab="Appearance" />);
    expect(screen.getByText('Card Size: Medium')).toBeInTheDocument();
    rerender(<SettingsModal {...defaultProps} initialTab="General" />);
    expect(screen.getByText('Half Star Ratings')).toBeInTheDocument();
  });

  it('removes keyboard listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<SettingsModal {...defaultProps} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  describe('TMDB API key', () => {
    it('renders TMDB key input in API Keys tab', () => {
      render(<SettingsModal {...defaultProps} initialTab="API Keys" />);
      expect(screen.getByPlaceholderText('Enter your TMDB API key')).toBeInTheDocument();
    });

    it('calls updateTmdbApiKey when Save TMDB Key is clicked', () => {
      const updateTmdbApiKey = vi.fn();
      render(<SettingsModal {...defaultProps} initialTab="API Keys" updateTmdbApiKey={updateTmdbApiKey} />);
      const input = screen.getByPlaceholderText('Enter your TMDB API key');
      fireEvent.change(input, { target: { value: 'my-tmdb-key' } });
      fireEvent.click(screen.getByText('Save TMDB Key'));
      expect(updateTmdbApiKey).toHaveBeenCalledWith('my-tmdb-key');
    });

    it('shows TMDB saved confirmation after saving', () => {
      render(<SettingsModal {...defaultProps} initialTab="API Keys" />);
      const input = screen.getByPlaceholderText('Enter your TMDB API key');
      fireEvent.change(input, { target: { value: 'tmdb-key-abc' } });
      fireEvent.click(screen.getByText('Save TMDB Key'));
      expect(screen.getByText('✓ TMDB key saved')).toBeInTheDocument();
    });

    it('saves TMDB key on Enter key in input', () => {
      const updateTmdbApiKey = vi.fn();
      render(<SettingsModal {...defaultProps} initialTab="API Keys" updateTmdbApiKey={updateTmdbApiKey} />);
      const input = screen.getByPlaceholderText('Enter your TMDB API key');
      fireEvent.change(input, { target: { value: 'enter-tmdb-key' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(updateTmdbApiKey).toHaveBeenCalledWith('enter-tmdb-key');
    });

    it('populates TMDB input from tmdbApiKey prop', () => {
      render(<SettingsModal {...defaultProps} initialTab="API Keys" tmdbApiKey="existing-tmdb-key" />);
      const input = screen.getByPlaceholderText('Enter your TMDB API key');
      expect(input.value).toBe('existing-tmdb-key');
    });
  });
});
