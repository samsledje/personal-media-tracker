// Color utility functions

import { STATUS_COLORS } from '../constants/index.js';

/**
 * Convert hex color to rgba format
 * @param {string} hex - Hex color string (with or without #)
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
export const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (with or without #)
 * @returns {object} RGB object with r, g, b properties (0-255)
 */
export const hexToRgb = (hex) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return { r, g, b };
};

/**
 * Convert RGB object to hex color
 * @param {object} rgb - RGB object with r, g, b properties (0-255)
 * @returns {string} Hex color string with #
 */
export const rgbToHex = (rgb) => {
  const toHex = (n) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/**
 * Calculate relative luminance of a color (WCAG formula)
 * @param {object} rgb - RGB object with r, g, b properties (0-255)
 * @returns {number} Relative luminance (0-1)
 */
export const getLuminance = (rgb) => {
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = sRGB.map(val => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Contrast ratio (1-21)
 */
export const getContrastRatio = (color1, color2) => {
  const lum1 = getLuminance(hexToRgb(color1));
  const lum2 = getLuminance(hexToRgb(color2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Adjust color lightness to meet WCAG contrast ratio
 * @param {string} textColor - Text color (hex)
 * @param {string} backgroundColor - Background color (hex)
 * @param {number} targetRatio - Target contrast ratio (default 4.5 for AA)
 * @returns {string} Adjusted color (hex)
 */
export const adjustColorForContrast = (textColor, backgroundColor, targetRatio = 4.5) => {
  const currentRatio = getContrastRatio(textColor, backgroundColor);
  
  // If already meets target, return as-is
  if (currentRatio >= targetRatio) {
    return textColor;
  }
  
  const bgLuminance = getLuminance(hexToRgb(backgroundColor));
  
  // Try both directions and pick the one that works best
  const lightenResult = adjustInDirection(textColor, backgroundColor, targetRatio, true);
  const darkenResult = adjustInDirection(textColor, backgroundColor, targetRatio, false);
  
  const lightenRatio = getContrastRatio(lightenResult, backgroundColor);
  const darkenRatio = getContrastRatio(darkenResult, backgroundColor);
  
  // Return whichever achieves better contrast
  if (lightenRatio >= targetRatio && darkenRatio >= targetRatio) {
    // Both work, choose based on background luminance
    return bgLuminance < 0.5 ? lightenResult : darkenResult;
  } else if (lightenRatio >= targetRatio) {
    return lightenResult;
  } else if (darkenRatio >= targetRatio) {
    return darkenResult;
  }
  
  // If neither works perfectly, return the better one
  return lightenRatio > darkenRatio ? lightenResult : darkenResult;
};

/**
 * Helper function to adjust color in a specific direction
 * @param {string} textColor - Text color (hex)
 * @param {string} backgroundColor - Background color (hex)
 * @param {number} targetRatio - Target contrast ratio
 * @param {boolean} shouldLighten - True to lighten, false to darken
 * @returns {string} Adjusted color (hex)
 */
const adjustInDirection = (textColor, backgroundColor, targetRatio, shouldLighten) => {
  const textRgb = hexToRgb(textColor);
  let low = 0;
  let high = 255;
  let bestRgb = textRgb;
  let bestRatio = getContrastRatio(textColor, backgroundColor);
  
  // Binary search for optimal adjustment
  for (let i = 0; i < 8; i++) {
    const mid = Math.floor((low + high) / 2);
    const factor = shouldLighten ? mid / 255 : -mid / 255;
    
    const rgb = {
      r: Math.max(0, Math.min(255, textRgb.r + (255 - textRgb.r) * factor)),
      g: Math.max(0, Math.min(255, textRgb.g + (255 - textRgb.g) * factor)),
      b: Math.max(0, Math.min(255, textRgb.b + (255 - textRgb.b) * factor))
    };
    
    if (!shouldLighten) {
      rgb.r = Math.max(0, textRgb.r + textRgb.r * factor);
      rgb.g = Math.max(0, textRgb.g + textRgb.g * factor);
      rgb.b = Math.max(0, textRgb.b + textRgb.b * factor);
    }
    
    const ratio = getContrastRatio(rgbToHex(rgb), backgroundColor);
    
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestRgb = rgb;
    }
    
    if (ratio >= targetRatio) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  
  return rgbToHex(bestRgb);
};

/**
 * Get hex color for status
 * @param {string} status - Status key (e.g., 'to-read', 'reading', 'read', etc.)
 * @returns {string} Hex color string
 */
export const getStatusColor = (status) => {
  const colorType = STATUS_COLORS[status];
  switch (colorType) {
    case 'blue':
      return '#3b82f6'; // blue-500
    case 'yellow':
      return '#eab308'; // yellow-500
    case 'green':
      return '#22c55e'; // green-500
    case 'red':
      return '#ef4444'; // red-500
    default:
      return '#3b82f6'; // blue-500
  }
};

/**
 * Apply theme colors to CSS variables
 * @param {string} primaryColor - Primary theme color
 * @param {string} highlightColor - Highlight theme color
 */
export const applyThemeColors = (primaryColor, highlightColor) => {
  try {
    document.documentElement.style.setProperty('--mt-primary', primaryColor);
    document.documentElement.style.setProperty('--mt-highlight', highlightColor);
    
    // Extract RGB values from highlight color for rgba() usage
    const highlightRgb = hexToRgba(highlightColor, 1).match(/\d+/g);
    if (highlightRgb && highlightRgb.length >= 3) {
      document.documentElement.style.setProperty('--mt-highlight-rgb', `${highlightRgb[0]}, ${highlightRgb[1]}, ${highlightRgb[2]}`);
    }

    // Adjust text colors for WCAG contrast ratio compliance
    // Different text elements have different base colors that need separate adjustment
    const textColors = {
      // Title text (white by default)
      title: '#ffffff',
      // Author/director text (slate-400 by default)
      author: '#94a3b8',
      // Year/metadata text (slate-500 by default)
      metadata: '#64748b'
    };

    // Adjust each text color separately for the primary background
    const adjustedTitle = adjustColorForContrast(textColors.title, primaryColor, 4.5);
    const adjustedAuthor = adjustColorForContrast(textColors.author, primaryColor, 4.5);
    const adjustedMetadata = adjustColorForContrast(textColors.metadata, primaryColor, 3.0);

    // Set CSS variables for adjusted text colors
    document.documentElement.style.setProperty('--mt-text-title', adjustedTitle);
    document.documentElement.style.setProperty('--mt-text-author', adjustedAuthor);
    document.documentElement.style.setProperty('--mt-text-metadata', adjustedMetadata);
  } catch {
    // ignore (server-side or non-browser)
  }
};