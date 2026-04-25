import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
};

describe('SettingsModal', () => {
  beforeEach(() => vi.clearAllMocks());

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
});
