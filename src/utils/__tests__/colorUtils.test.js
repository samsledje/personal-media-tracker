import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hexToRgba,
  hexToRgb,
  rgbToHex,
  getLuminance,
  getContrastRatio,
  adjustColorForContrast,
  applyThemeColors
} from '../../utils/colorUtils.js';

describe('colorUtils', () => {
  describe('hexToRgba', () => {
    it('should convert 6-digit hex to rgba', () => {
      const result = hexToRgba('#ff0000', 1);
      expect(result).toBe('rgba(255, 0, 0, 1)');
    });

    it('should convert hex without # to rgba', () => {
      const result = hexToRgba('00ff00', 1);
      expect(result).toBe('rgba(0, 255, 0, 1)');
    });

    it('should handle 3-digit hex shorthand', () => {
      const result = hexToRgba('#f00', 1);
      expect(result).toBe('rgba(255, 0, 0, 1)');
    });

    it('should handle 3-digit hex shorthand without #', () => {
      const result = hexToRgba('0f0', 1);
      expect(result).toBe('rgba(0, 255, 0, 1)');
    });

    it('should apply alpha value', () => {
      const result = hexToRgba('#ffffff', 0.5);
      expect(result).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('should handle alpha value of 0', () => {
      const result = hexToRgba('#000000', 0);
      expect(result).toBe('rgba(0, 0, 0, 0)');
    });

    it('should default alpha to 1 if not provided', () => {
      const result = hexToRgba('#123456');
      expect(result).toContain(', 1)');
    });

    it('should handle black color', () => {
      const result = hexToRgba('#000000', 1);
      expect(result).toBe('rgba(0, 0, 0, 1)');
    });

    it('should handle white color', () => {
      const result = hexToRgba('#ffffff', 1);
      expect(result).toBe('rgba(255, 255, 255, 1)');
    });

    it('should handle blue color', () => {
      const result = hexToRgba('#0000ff', 1);
      expect(result).toBe('rgba(0, 0, 255, 1)');
    });

    it('should handle custom colors', () => {
      const result = hexToRgba('#3b82f6', 1);
      expect(result).toBe('rgba(59, 130, 246, 1)');
    });

    it('should handle null or undefined', () => {
      const result = hexToRgba(null, 0.5);
      expect(result).toBe('rgba(0,0,0,0.5)');
    });

    it('should handle empty string', () => {
      const result = hexToRgba('', 0.5);
      expect(result).toBe('rgba(0,0,0,0.5)');
    });

    it('should handle lowercase hex', () => {
      const result = hexToRgba('#abc def', 1);
      // Should handle the hex part
      expect(result).toContain('rgba');
    });

    it('should handle uppercase hex', () => {
      const result = hexToRgba('#ABCDEF', 1);
      expect(result).toBe('rgba(171, 205, 239, 1)');
    });
  });

  describe('applyThemeColors', () => {
    let mockSetProperty;
    
    beforeEach(() => {
      // Mock document.documentElement.style.setProperty
      mockSetProperty = vi.fn();
      if (typeof document !== 'undefined' && document.documentElement) {
        vi.spyOn(document.documentElement.style, 'setProperty').mockImplementation(mockSetProperty);
      }
    });

    it('should set CSS variables for theme colors', () => {
      if (typeof document === 'undefined') {
        // Skip in non-browser environments
        expect(true).toBe(true);
        return;
      }

      const primaryColor = '#3b82f6';
      const highlightColor = '#ef4444';
      
      applyThemeColors(primaryColor, highlightColor);
      
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-primary',
        primaryColor
      );
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-highlight',
        highlightColor
      );
    });

    it('should extract and set highlight RGB values', () => {
      if (typeof document === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const primaryColor = '#3b82f6';
      const highlightColor = '#ef4444'; // rgb(239, 68, 68)
      
      applyThemeColors(primaryColor, highlightColor);
      
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-highlight-rgb',
        '239, 68, 68'
      );
    });

    it('should handle errors gracefully', () => {
      // Should not throw even if document is not available
      expect(() => {
        applyThemeColors('#000000', '#ffffff');
      }).not.toThrow();
    });

    it('should work with 3-digit hex colors', () => {
      if (typeof document === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const primaryColor = '#f00';
      const highlightColor = '#0f0';
      
      applyThemeColors(primaryColor, highlightColor);
      
      expect(mockSetProperty).toHaveBeenCalled();
    });

    it('should set adjusted text color CSS variables', () => {
      if (typeof document === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const primaryColor = '#0b1220';
      const highlightColor = '#7c3aed';
      
      applyThemeColors(primaryColor, highlightColor);
      
      // Check that text color variables are set
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-text-title',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-text-author',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-text-metadata',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
    });

    it('should adjust text colors for light backgrounds', () => {
      if (typeof document === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const lightPrimary = '#e0e0e0';
      const highlightColor = '#7c3aed';
      
      applyThemeColors(lightPrimary, highlightColor);
      
      // Should set text color variables
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-text-title',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
      expect(mockSetProperty).toHaveBeenCalledWith(
        '--mt-text-author',
        expect.stringMatching(/^#[0-9a-f]{6}$/)
      );
    });
  });

  describe('hexToRgb', () => {
    it('should convert 6-digit hex to RGB object', () => {
      const result = hexToRgb('#ff0000');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert hex without # to RGB object', () => {
      const result = hexToRgb('00ff00');
      expect(result).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should handle 3-digit hex shorthand', () => {
      const result = hexToRgb('#f00');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle null or undefined', () => {
      const result = hexToRgb(null);
      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB object to hex', () => {
      const result = rgbToHex({ r: 255, g: 0, b: 0 });
      expect(result).toBe('#ff0000');
    });

    it('should handle white', () => {
      const result = rgbToHex({ r: 255, g: 255, b: 255 });
      expect(result).toBe('#ffffff');
    });

    it('should handle black', () => {
      const result = rgbToHex({ r: 0, g: 0, b: 0 });
      expect(result).toBe('#000000');
    });

    it('should clamp values above 255', () => {
      const result = rgbToHex({ r: 300, g: 100, b: 50 });
      expect(result).toBe('#ff6432');
    });

    it('should clamp values below 0', () => {
      const result = rgbToHex({ r: -10, g: 100, b: 50 });
      expect(result).toBe('#006432');
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance for white', () => {
      const result = getLuminance({ r: 255, g: 255, b: 255 });
      expect(result).toBeCloseTo(1, 2);
    });

    it('should calculate luminance for black', () => {
      const result = getLuminance({ r: 0, g: 0, b: 0 });
      expect(result).toBeCloseTo(0, 2);
    });

    it('should calculate luminance for gray', () => {
      const result = getLuminance({ r: 128, g: 128, b: 128 });
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('should calculate luminance for red', () => {
      const result = getLuminance({ r: 255, g: 0, b: 0 });
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.5);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio between black and white', () => {
      const result = getContrastRatio('#000000', '#ffffff');
      expect(result).toBeCloseTo(21, 1);
    });

    it('should calculate contrast ratio between white and black', () => {
      const result = getContrastRatio('#ffffff', '#000000');
      expect(result).toBeCloseTo(21, 1);
    });

    it('should calculate contrast ratio of same color as 1', () => {
      const result = getContrastRatio('#ff0000', '#ff0000');
      expect(result).toBeCloseTo(1, 1);
    });

    it('should handle typical text on background combinations', () => {
      // White text on dark blue background
      const result = getContrastRatio('#ffffff', '#0b1220');
      expect(result).toBeGreaterThan(4.5); // Should meet WCAG AA
    });

    it('should detect insufficient contrast', () => {
      // Light gray on white (poor contrast)
      const result = getContrastRatio('#cccccc', '#ffffff');
      expect(result).toBeLessThan(4.5);
    });
  });

  describe('adjustColorForContrast', () => {
    it('should not change color if contrast is already sufficient', () => {
      // White on dark background already has good contrast
      const result = adjustColorForContrast('#ffffff', '#0b1220', 4.5);
      const ratio = getContrastRatio(result, '#0b1220');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should lighten text on dark backgrounds', () => {
      // Gray text on dark background
      const result = adjustColorForContrast('#333333', '#0b1220', 4.5);
      const ratio = getContrastRatio(result, '#0b1220');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // Result should be lighter than original
      const originalLum = getLuminance(hexToRgb('#333333'));
      const adjustedLum = getLuminance(hexToRgb(result));
      expect(adjustedLum).toBeGreaterThanOrEqual(originalLum);
    });

    it('should darken text on light backgrounds', () => {
      // Light text on light background
      const result = adjustColorForContrast('#cccccc', '#f0f0f0', 4.5);
      const ratio = getContrastRatio(result, '#f0f0f0');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // Result should be darker than original
      const originalLum = getLuminance(hexToRgb('#cccccc'));
      const adjustedLum = getLuminance(hexToRgb(result));
      expect(adjustedLum).toBeLessThanOrEqual(originalLum);
    });

    it('should meet AA standard (4.5:1) for normal text', () => {
      const result = adjustColorForContrast('#94a3b8', '#0b1220', 4.5);
      const ratio = getContrastRatio(result, '#0b1220');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should meet AAA standard (7:1) when specified', () => {
      const result = adjustColorForContrast('#94a3b8', '#0b1220', 7.0);
      const ratio = getContrastRatio(result, '#0b1220');
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('should handle light primary colors', () => {
      // Test with a light primary color
      const result = adjustColorForContrast('#ffffff', '#e0e0e0', 4.5);
      const ratio = getContrastRatio(result, '#e0e0e0');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should handle custom target ratios', () => {
      const result = adjustColorForContrast('#64748b', '#0b1220', 3.0);
      const ratio = getContrastRatio(result, '#0b1220');
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });
});
