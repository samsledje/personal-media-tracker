import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHalfStars } from '../useHalfStars.js';

// Mock configService - must use vi.fn() directly in factory
vi.mock('../../services/configService.js', () => ({
  loadHalfStarsEnabled: vi.fn(() => true),
  saveHalfStarsEnabled: vi.fn()
}));

// Import after mock
import { loadHalfStarsEnabled, saveHalfStarsEnabled } from '../../services/configService.js';

describe('useHalfStars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadHalfStarsEnabled.mockReturnValue(true);
    saveHalfStarsEnabled.mockClear();
  });

  it('should initialize with value from configService', () => {
    loadHalfStarsEnabled.mockReturnValue(true);
    
    const { result } = renderHook(() => useHalfStars());
    
    expect(result.current[0]).toBe(true);
    expect(loadHalfStarsEnabled).toHaveBeenCalled();
  });

  it('should initialize with false when configService returns false', () => {
    loadHalfStarsEnabled.mockReturnValue(false);
    
    const { result } = renderHook(() => useHalfStars());
    
    expect(result.current[0]).toBe(false);
  });

  it('should return setter function', () => {
    const { result } = renderHook(() => useHalfStars());
    
    expect(typeof result.current[1]).toBe('function');
  });

  it('should update state and save to configService', async () => {
    loadHalfStarsEnabled.mockReturnValue(true);
    
    const { result } = renderHook(() => useHalfStars());
    
    expect(result.current[0]).toBe(true);
    
    act(() => {
      result.current[1](false);
    });
    
    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });
    
    expect(saveHalfStarsEnabled).toHaveBeenCalledWith(false);
  });

  it('should update state when setting to true', async () => {
    loadHalfStarsEnabled.mockReturnValue(false);
    
    const { result } = renderHook(() => useHalfStars());
    
    expect(result.current[0]).toBe(false);
    
    act(() => {
      result.current[1](true);
    });
    
    await waitFor(() => {
      expect(result.current[0]).toBe(true);
    });
    
    expect(saveHalfStarsEnabled).toHaveBeenCalledWith(true);
  });

  it('should load value from configService on mount', () => {
    loadHalfStarsEnabled.mockReturnValue(true);
    
    renderHook(() => useHalfStars());
    
    expect(loadHalfStarsEnabled).toHaveBeenCalled();
  });

  it('should update state when configService value changes on mount', () => {
    loadHalfStarsEnabled.mockReturnValue(false);
    
    const { result } = renderHook(() => useHalfStars());
    
    expect(result.current[0]).toBe(false);
    
    // Simulate configService returning different value
    loadHalfStarsEnabled.mockReturnValue(true);
    
    // Re-render to trigger useEffect
    const { result: result2 } = renderHook(() => useHalfStars());
    
    expect(result2.current[0]).toBe(true);
  });

  it('should persist state changes to configService', async () => {
    loadHalfStarsEnabled.mockReturnValue(true);
    
    const { result } = renderHook(() => useHalfStars());
    
    act(() => {
      result.current[1](false);
    });
    
    await waitFor(() => {
      expect(saveHalfStarsEnabled).toHaveBeenCalledWith(false);
    });
    
    act(() => {
      result.current[1](true);
    });
    
    await waitFor(() => {
      expect(saveHalfStarsEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('should handle multiple rapid state changes', async () => {
    loadHalfStarsEnabled.mockReturnValue(true);
    
    const { result } = renderHook(() => useHalfStars());
    
    act(() => {
      result.current[1](false);
      result.current[1](true);
      result.current[1](false);
    });
    
    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });
    
    // Should save the final value
    expect(saveHalfStarsEnabled).toHaveBeenCalledWith(false);
  });

  it('should return array with two elements', () => {
    const { result } = renderHook(() => useHalfStars());
    
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(2);
  });

  it('should maintain state across re-renders', () => {
    loadHalfStarsEnabled.mockReturnValue(true);
    
    const { result, rerender } = renderHook(() => useHalfStars());
    
    expect(result.current[0]).toBe(true);
    
    rerender();
    
    expect(result.current[0]).toBe(true);
  });
});

