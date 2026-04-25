import { useState, useEffect } from 'react';
import { loadThemeColors, saveThemeColors, loadCardSize, saveCardSize, loadAllSettings, saveAllSettings } from '../services/configService.js';
import { applyThemeColors } from '../utils/colorUtils.js';
import { DEFAULT_THEME } from '../constants/index.js';

/**
 * Custom hook for managing theme and appearance settings
 * @param {StorageAdapter} storage - Storage adapter instance (optional)
 * @returns {object} Theme state and actions
 */
export const useTheme = (storage = null) => {
  const [primaryColor, setPrimaryColor] = useState(() => {
    const { primary } = loadThemeColors();
    return primary;
  });

  const [highlightColor, setHighlightColor] = useState(() => {
    const { highlight } = loadThemeColors();
    return highlight;
  });

  const [cardSize, setCardSize] = useState(() => {
    return loadCardSize();
  });

  // Load settings from file when storage becomes available
  useEffect(() => {
    if (storage && storage.isConnected()) {
      loadAllSettings(storage).then(settings => {
        if (settings.themePrimary) setPrimaryColor(settings.themePrimary);
        if (settings.themeHighlight) setHighlightColor(settings.themeHighlight);
        if (settings.cardSize) setCardSize(settings.cardSize);
      }).catch(err => {
        console.warn('Error loading settings from file:', err);
      });
    }
  }, [storage]);

  // Apply theme colors when they change
  useEffect(() => {
    saveThemeColors(primaryColor, highlightColor);
    applyThemeColors(primaryColor, highlightColor);
    // Also save to file if storage is available (batch both colors)
    if (storage && storage.isConnected()) {
      saveAllSettings(storage, {
        themePrimary: primaryColor,
        themeHighlight: highlightColor
      }).catch(err => console.warn('Error saving theme to file:', err));
    }
  }, [primaryColor, highlightColor, storage]);

  // Save card size when it changes
  useEffect(() => {
    saveCardSize(cardSize);
    // Also save to file if storage is available
    if (storage && storage.isConnected()) {
      saveAllSettings(storage, { cardSize }).catch(err => console.warn('Error saving card size to file:', err));
    }
  }, [cardSize, storage]);

  /**
   * Update primary color
   */
  const updatePrimaryColor = (color) => {
    setPrimaryColor(color);
  };

  /**
   * Update highlight color
   */
  const updateHighlightColor = (color) => {
    setHighlightColor(color);
  };

  /**
   * Update card size
   */
  const updateCardSize = (size) => {
    setCardSize(size);
  };

  /**
   * Reset theme to defaults
   */
  const resetTheme = () => {
    setPrimaryColor(DEFAULT_THEME.PRIMARY);
    setHighlightColor(DEFAULT_THEME.HIGHLIGHT);
  };

  return {
    primaryColor,
    highlightColor,
    cardSize,
    updatePrimaryColor,
    updateHighlightColor,
    updateCardSize,
    resetTheme
  };
};