// Configuration file service for managing .mmt.config file
// This service reads and writes preferences to a .mmt.config file in the storage directory

import { DEFAULT_THEME } from '../constants/index.js';

const CONFIG_FILENAME = '.mmt.config';

/**
 * Parse config file content (JSON format)
 * @param {string} content - File content
 * @returns {object} Parsed config object
 */
const parseConfigFile = (content) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.warn('Error parsing config file:', error);
    return {};
  }
};

/**
 * Load configuration from .mmt.config file in storage
 * @param {StorageAdapter} storage - Storage adapter instance
 * @returns {Promise<object>} Configuration object
 */
export const loadConfigFromFile = async (storage) => {
  if (!storage || !storage.isConnected()) {
    return {};
  }

  try {
    const content = await storage.readFile(CONFIG_FILENAME);
    if (!content) {
      // File doesn't exist, return empty config
      return {};
    }
    return parseConfigFile(content);
  } catch (error) {
    console.warn('Error loading config from file:', error);
    return {};
  }
};

/**
 * Save configuration to .mmt.config file in storage
 * @param {StorageAdapter} storage - Storage adapter instance
 * @param {object} config - Configuration object to save
 * @returns {Promise<boolean>} Success status
 */
export const saveConfigToFile = async (storage, config) => {
  if (!storage || !storage.isConnected()) {
    console.warn('Cannot save config: storage not connected');
    return false;
  }

  try {
    const existingConfig = await loadConfigFromFile(storage);
    const mergedConfig = { ...existingConfig, ...config };
    const content = JSON.stringify(mergedConfig, null, 2);
    await storage.writeFile(CONFIG_FILENAME, content);
    return true;
  } catch (error) {
    console.error('Error saving config to file:', error);
    return false;
  }
};

/**
 * Update a specific config value in the file
 * @param {StorageAdapter} storage - Storage adapter instance
 * @param {string} key - Config key
 * @param {any} value - Config value
 * @returns {Promise<boolean>} Success status
 */
export const updateConfigValue = async (storage, key, value) => {
  if (!storage || !storage.isConnected()) {
    return false;
  }

  try {
    const currentConfig = await loadConfigFromFile(storage);
    const updatedConfig = { ...currentConfig, [key]: value };
    return await saveConfigToFile(storage, updatedConfig);
  } catch (error) {
    console.error('Error updating config value:', error);
    return false;
  }
};

/**
 * Get a specific config value from the file
 * @param {StorageAdapter} storage - Storage adapter instance
 * @param {string} key - Config key
 * @param {any} defaultValue - Default value if key not found
 * @returns {Promise<any>} Config value
 */
export const getConfigValue = async (storage, key, defaultValue = null) => {
  try {
    const config = await loadConfigFromFile(storage);
    return config[key] !== undefined ? config[key] : defaultValue;
  } catch (error) {
    console.error('Error getting config value:', error);
    return defaultValue;
  }
};

/**
 * Merge local storage config with file config (file takes priority)
 * @param {object} localConfig - Config from localStorage
 * @param {object} fileConfig - Config from .mmt.config file
 * @returns {object} Merged config
 */
export const mergeConfigs = (localConfig, fileConfig) => {
  return {
    ...localConfig,
    ...fileConfig
  };
};

/**
 * Get default config values
 * @returns {object} Default configuration
 */
export const getDefaultConfig = () => {
  return {
    themePrimary: DEFAULT_THEME.PRIMARY,
    themeHighlight: DEFAULT_THEME.HIGHLIGHT,
    cardSize: 'medium',
    halfStarsEnabled: true,
    omdbApiKey: ''
  };
};
