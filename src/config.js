// Default configuration - will be overridden by user settings in localStorage
const defaultConfig = {
  omdbApiKey: '', // Empty by default, will be set by user
  tmdbApiKey: '', // Optional - enables director/actor search via TMDB
  googleDriveFolderName: 'MarkdownMediaTracker' // Default Google Drive folder name
};

// Get config from localStorage or use defaults
const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem('mediaTracker_config');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load config from localStorage:', error);
    return {};
  }
};

// Save config to localStorage
export const saveConfig = (newConfig) => {
  try {
    const currentConfig = getStoredConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    localStorage.setItem('mediaTracker_config', JSON.stringify(updatedConfig));
    // Update the runtime config
    Object.assign(config, updatedConfig);
    return true;
  } catch (error) {
    console.error('Failed to save config to localStorage:', error);
    return false;
  }
};

// Get current config value
export const getConfig = (key) => {
  return config[key];
};

// Check if OMDb API key is configured
export const hasApiKey = () => {
  return Boolean(config.omdbApiKey);
};

// Check if TMDB API key is configured
export const hasTmdbApiKey = () => {
  return Boolean(config.tmdbApiKey);
};

// Initialize config by merging defaults with stored values
export const config = {
  ...defaultConfig,
  ...getStoredConfig()
};