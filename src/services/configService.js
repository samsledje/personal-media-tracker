// Configuration service for managing app settings

import { LOCAL_STORAGE_KEYS, DEFAULT_THEME } from '../constants/index.js';
import { loadConfigFromFile, saveConfigToFile, mergeConfigs } from './configFileService.js';
import { saveConfig } from '../config.js';

const MEDIA_TRACKER_CONFIG_KEY = 'mediaTracker_config';

/**
 * Load OMDb API key from localStorage
 * @returns {string} API key or empty string
 */
export const loadOmdbApiKey = () => {
  try {
    const stored = localStorage.getItem(MEDIA_TRACKER_CONFIG_KEY);
    return (stored ? JSON.parse(stored) : {}).omdbApiKey || '';
  } catch (error) {
    console.warn('Error loading OMDb API key:', error);
    return '';
  }
};

/**
 * Save OMDb API key to localStorage
 * @param {string} apiKey - API key to save
 */
export const saveOmdbApiKey = (apiKey) => {
  saveConfig({ omdbApiKey: apiKey });
};

/**
 * Load theme colors from localStorage
 * @returns {object} Theme colors
 */
export const loadThemeColors = () => {
  try {
    return {
      primary: localStorage.getItem(LOCAL_STORAGE_KEYS.THEME_PRIMARY) || DEFAULT_THEME.PRIMARY,
      highlight: localStorage.getItem(LOCAL_STORAGE_KEYS.THEME_HIGHLIGHT) || DEFAULT_THEME.HIGHLIGHT
    };
  } catch (error) {
    console.warn('Error loading theme colors:', error);
    return DEFAULT_THEME;
  }
};

/**
 * Save theme colors to localStorage
 * @param {string} primary - Primary color
 * @param {string} highlight - Highlight color
 */
export const saveThemeColors = (primary, highlight) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_PRIMARY, primary);
    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_HIGHLIGHT, highlight);
  } catch (error) {
    console.warn('Error saving theme colors:', error);
  }
};

/**
 * Load card size from localStorage
 * @returns {string} Card size
 */
export const loadCardSize = () => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.CARD_SIZE) || 'medium';
  } catch (error) {
    console.warn('Error loading card size:', error);
    return 'medium';
  }
};

/**
 * Save card size to localStorage
 * @param {string} size - Card size
 */
export const saveCardSize = (size) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CARD_SIZE, size);
  } catch (error) {
    console.warn('Error saving card size:', error);
  }
};

/**
 * Load half stars enabled setting from localStorage
 * @returns {boolean} Half stars enabled
 */
export const loadHalfStarsEnabled = () => {
  try {
    const value = localStorage.getItem(LOCAL_STORAGE_KEYS.HALF_STARS_ENABLED);
    // Default to true if not set
    return value === null ? true : value === 'true';
  } catch (error) {
    console.warn('Error loading half stars setting:', error);
    return true;
  }
};

/**
 * Save half stars enabled setting to localStorage
 * @param {boolean} enabled - Half stars enabled
 */
export const saveHalfStarsEnabled = (enabled) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.HALF_STARS_ENABLED, String(enabled));
  } catch (error) {
    console.warn('Error saving half stars setting:', error);
  }
};

// File-based configuration functions with localStorage fallback

/**
 * Load all settings, prioritizing file-based config over localStorage
 * @param {StorageAdapter} storage - Storage adapter instance
 * @returns {Promise<object>} All configuration settings
 */
export const loadAllSettings = async (storage) => {
  // Load from localStorage as fallback
  const localStorageConfig = {
    themePrimary: loadThemeColors().primary,
    themeHighlight: loadThemeColors().highlight,
    cardSize: loadCardSize(),
    halfStarsEnabled: loadHalfStarsEnabled(),
    omdbApiKey: loadOmdbApiKey()
  };

  // If storage is not connected, return localStorage values
  if (!storage || !storage.isConnected()) {
    return localStorageConfig;
  }

  try {
    // Load from file
    const fileConfig = await loadConfigFromFile(storage);
    
    // Merge configs (file takes priority)
    return mergeConfigs(localStorageConfig, fileConfig);
  } catch (error) {
    console.warn('Error loading settings from file, using localStorage:', error);
    return localStorageConfig;
  }
};

/**
 * Save all settings to both localStorage and file
 * @param {StorageAdapter} storage - Storage adapter instance
 * @param {object} settings - Settings object
 * @returns {Promise<void>}
 */
export const saveAllSettings = async (storage, settings) => {
  // Always save to localStorage as fallback
  // For theme colors, we need both values to call saveThemeColors
  // So we load existing colors if only one is provided
  if (settings.themePrimary !== undefined || settings.themeHighlight !== undefined) {
    const currentColors = loadThemeColors();
    const primary = settings.themePrimary !== undefined ? settings.themePrimary : currentColors.primary;
    const highlight = settings.themeHighlight !== undefined ? settings.themeHighlight : currentColors.highlight;
    saveThemeColors(primary, highlight);
  }
  if (settings.cardSize !== undefined) {
    saveCardSize(settings.cardSize);
  }
  if (settings.halfStarsEnabled !== undefined) {
    saveHalfStarsEnabled(settings.halfStarsEnabled);
  }
  if (settings.omdbApiKey !== undefined) {
    saveOmdbApiKey(settings.omdbApiKey);
  }
  if (settings.tmdbApiKey !== undefined) {
    saveConfig({ tmdbApiKey: settings.tmdbApiKey });
  }

  // Also save to file if storage is connected
  if (storage && storage.isConnected()) {
    try {
      await saveConfigToFile(storage, settings);
    } catch (error) {
      console.warn('Error saving settings to file:', error);
    }
  }
};

