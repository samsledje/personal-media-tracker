import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOmdbApi } from '../useOmdbApi.js';

// Mock config module - must use vi.fn() directly in factory
vi.mock('../../config.js', () => {
  let config = { omdbApiKey: '' };
  return {
    getConfig: vi.fn((key) => {
      if (key === 'omdbApiKey') return config.omdbApiKey;
      return null;
    }),
    saveConfig: vi.fn((newConfig) => {
      config = { ...config, ...newConfig };
      return true;
    }),
    hasApiKey: vi.fn(() => Boolean(config.omdbApiKey)),
    config: config
  };
});

// Import after mock
import { getConfig, saveConfig, hasApiKey } from '../../config.js';

describe('useOmdbApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config state
    getConfig.mockImplementation((key) => {
      if (key === 'omdbApiKey') return '';
      return null;
    });
    hasApiKey.mockImplementation(() => false);
    saveConfig.mockImplementation(() => true);
  });

  it('should initialize with empty API key', () => {
    getConfig.mockReturnValue('');
    hasApiKey.mockReturnValue(false);
    
    const { result } = renderHook(() => useOmdbApi());
    
    expect(result.current.omdbApiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
  });

  it('should load existing API key from config', () => {
    getConfig.mockReturnValue('test-api-key-123');
    hasApiKey.mockReturnValue(true);
    
    const { result } = renderHook(() => useOmdbApi());
    
    expect(result.current.omdbApiKey).toBe('test-api-key-123');
    expect(result.current.hasApiKey).toBe(true);
    expect(getConfig).toHaveBeenCalledWith('omdbApiKey');
  });

  it('should update API key and save to config', async () => {
    getConfig.mockReturnValue('');
    hasApiKey.mockReturnValue(false);
    saveConfig.mockReturnValue(true);
    
    const { result } = renderHook(() => useOmdbApi());
    
    expect(result.current.omdbApiKey).toBe('');
    
    act(() => {
      result.current.updateApiKey('new-api-key-456');
    });
    
    await waitFor(() => {
      expect(result.current.omdbApiKey).toBe('new-api-key-456');
    });
    
    expect(saveConfig).toHaveBeenCalledWith({ omdbApiKey: 'new-api-key-456' });
  });

  it('should update hasApiKey when API key is set', async () => {
    getConfig.mockReturnValue('');
    hasApiKey.mockReturnValue(false);
    
    const { result } = renderHook(() => useOmdbApi());
    
    expect(result.current.hasApiKey).toBe(false);
    
    act(() => {
      result.current.updateApiKey('test-key');
    });
    
    // hasApiKey should be updated after save
    await waitFor(() => {
      expect(result.current.omdbApiKey).toBe('test-key');
    });
  });

  it('should handle empty API key', async () => {
    getConfig.mockReturnValue('existing-key');
    hasApiKey.mockReturnValue(true);
    
    const { result } = renderHook(() => useOmdbApi());
    
    act(() => {
      result.current.updateApiKey('');
    });
    
    await waitFor(() => {
      expect(result.current.omdbApiKey).toBe('');
    });
    
    expect(saveConfig).toHaveBeenCalledWith({ omdbApiKey: '' });
  });

  it('should handle whitespace-only API key', async () => {
    getConfig.mockReturnValue('');
    
    const { result } = renderHook(() => useOmdbApi());
    
    act(() => {
      result.current.updateApiKey('   ');
    });
    
    await waitFor(() => {
      expect(result.current.omdbApiKey).toBe('   ');
    });
    
    expect(saveConfig).toHaveBeenCalledWith({ omdbApiKey: '   ' });
  });

  it('should return updateApiKey function', () => {
    const { result } = renderHook(() => useOmdbApi());
    
    expect(typeof result.current.updateApiKey).toBe('function');
  });

  it('should return hasApiKey boolean', () => {
    const { result } = renderHook(() => useOmdbApi());
    
    expect(typeof result.current.hasApiKey).toBe('boolean');
  });

  it('should maintain API key state across re-renders', async () => {
    getConfig.mockReturnValue('persistent-key');
    hasApiKey.mockReturnValue(true);
    
    const { result, rerender } = renderHook(() => useOmdbApi());
    
    expect(result.current.omdbApiKey).toBe('persistent-key');
    
    rerender();
    
    expect(result.current.omdbApiKey).toBe('persistent-key');
  });

  it('should load API key on mount', () => {
    getConfig.mockReturnValue('loaded-key');
    hasApiKey.mockReturnValue(true);
    
    renderHook(() => useOmdbApi());
    
    expect(getConfig).toHaveBeenCalledWith('omdbApiKey');
  });
});

