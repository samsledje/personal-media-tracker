import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadOmdbApiKey,
  saveOmdbApiKey,
  loadThemeColors,
  saveThemeColors,
  loadCardSize,
  saveCardSize,
  loadHalfStarsEnabled,
  saveHalfStarsEnabled,
} from '../../services/configService.js';
import { LOCAL_STORAGE_KEYS, DEFAULT_THEME, CARD_SIZES } from '../../constants/index.js';

describe('configService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('loadOmdbApiKey', () => {
    it('should load API key from localStorage', () => {
      localStorage.setItem('mediaTracker_config', JSON.stringify({ omdbApiKey: 'test-api-key' }));

      const result = loadOmdbApiKey();

      expect(result).toBe('test-api-key');
    });

    it('should return empty string if no API key stored', () => {
      const result = loadOmdbApiKey();

      expect(result).toBe('');
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = loadOmdbApiKey();

      expect(result).toBe('');
      spy.mockRestore();
    });
  });

  describe('saveOmdbApiKey', () => {
    it('should save API key to localStorage', () => {
      saveOmdbApiKey('new-api-key');

      const stored = JSON.parse(localStorage.getItem('mediaTracker_config'));
      expect(stored.omdbApiKey).toBe('new-api-key');
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => saveOmdbApiKey('test')).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('loadThemeColors', () => {
    it('should load theme colors from localStorage', () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_PRIMARY, '#ff0000');
      localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_HIGHLIGHT, '#00ff00');
      
      const result = loadThemeColors();
      
      expect(result.primary).toBe('#ff0000');
      expect(result.highlight).toBe('#00ff00');
    });

    it('should return default colors if not stored', () => {
      const result = loadThemeColors();
      
      expect(result.primary).toBe(DEFAULT_THEME.PRIMARY);
      expect(result.highlight).toBe(DEFAULT_THEME.HIGHLIGHT);
    });

    it('should use default for missing primary color', () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_HIGHLIGHT, '#00ff00');
      
      const result = loadThemeColors();
      
      expect(result.primary).toBe(DEFAULT_THEME.PRIMARY);
      expect(result.highlight).toBe('#00ff00');
    });

    it('should use default for missing highlight color', () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_PRIMARY, '#ff0000');
      
      const result = loadThemeColors();
      
      expect(result.primary).toBe('#ff0000');
      expect(result.highlight).toBe(DEFAULT_THEME.HIGHLIGHT);
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = loadThemeColors();
      
      expect(result).toEqual(DEFAULT_THEME);
      spy.mockRestore();
    });
  });

  describe('saveThemeColors', () => {
    it('should save theme colors to localStorage', () => {
      saveThemeColors('#ff0000', '#00ff00');
      
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.THEME_PRIMARY)).toBe('#ff0000');
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.THEME_HIGHLIGHT)).toBe('#00ff00');
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => saveThemeColors('#ff0000', '#00ff00')).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('loadCardSize', () => {
    it('should load card size from localStorage', () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CARD_SIZE, CARD_SIZES.LARGE);
      
      const result = loadCardSize();
      
      expect(result).toBe(CARD_SIZES.LARGE);
    });

    it('should return default card size if not stored', () => {
      const result = loadCardSize();
      
      expect(result).toBe(CARD_SIZES.MEDIUM);
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = loadCardSize();
      
      expect(result).toBe(CARD_SIZES.MEDIUM);
      spy.mockRestore();
    });
  });

  describe('saveCardSize', () => {
    it('should save card size to localStorage', () => {
      saveCardSize(CARD_SIZES.SMALL);
      
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.CARD_SIZE)).toBe(CARD_SIZES.SMALL);
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => saveCardSize(CARD_SIZES.LARGE)).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('loadHalfStarsEnabled', () => {
    it('should load half stars setting from localStorage', () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.HALF_STARS_ENABLED, 'true');
      
      const result = loadHalfStarsEnabled();
      
      expect(result).toBe(true);
    });

    it('should return true by default if not set', () => {
      const result = loadHalfStarsEnabled();
      
      expect(result).toBe(true);
    });

    it('should return false when set to false', () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.HALF_STARS_ENABLED, 'false');
      
      const result = loadHalfStarsEnabled();
      
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = loadHalfStarsEnabled();
      
      expect(result).toBe(true);
      spy.mockRestore();
    });
  });

  describe('saveHalfStarsEnabled', () => {
    it('should save half stars setting to localStorage', () => {
      saveHalfStarsEnabled(false);
      
      const result = localStorage.getItem(LOCAL_STORAGE_KEYS.HALF_STARS_ENABLED);
      
      expect(result).toBe('false');
    });

    it('should save true value correctly', () => {
      saveHalfStarsEnabled(true);
      
      const result = localStorage.getItem(LOCAL_STORAGE_KEYS.HALF_STARS_ENABLED);
      
      expect(result).toBe('true');
    });

    it('should handle errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => saveHalfStarsEnabled(true)).not.toThrow();
      spy.mockRestore();
    });
  });
});
