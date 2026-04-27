import { useState, useEffect } from 'react';
import { getConfig, saveConfig, hasApiKey } from '../config.js';
import { loadAllSettings, saveAllSettings } from '../services/configService.js';


/**
 * Custom hook for managing OMDb API key
 * @param {StorageAdapter} storage - Storage adapter instance (optional)
 * @returns {object} API key state and actions
 */
export const useOmdbApi = (storage = null) => {
  const [omdbApiKey, setOmdbApiKey] = useState('');
  const [tmdbApiKey, setTmdbApiKey] = useState('');

  // Load API keys on mount and when storage changes
  useEffect(() => {
    if (storage && storage.isConnected()) {
      loadAllSettings(storage).then(settings => {
        // OMDb key
        const fileOmdbKey = settings.omdbApiKey;
        const localOmdbKey = getConfig('omdbApiKey');
        const omdbKey = fileOmdbKey || localOmdbKey || '';
        setOmdbApiKey(omdbKey);
        if (!fileOmdbKey && localOmdbKey) {
          saveAllSettings(storage, { omdbApiKey: localOmdbKey }).catch(err => console.warn('Error migrating OMDb API key to file:', err));
        }

        // TMDB key
        const fileTmdbKey = settings.tmdbApiKey;
        const localTmdbKey = getConfig('tmdbApiKey');
        const tmdbKey = fileTmdbKey || localTmdbKey || '';
        setTmdbApiKey(tmdbKey);
        if (!fileTmdbKey && localTmdbKey) {
          saveAllSettings(storage, { tmdbApiKey: localTmdbKey }).catch(err => console.warn('Error migrating TMDB API key to file:', err));
        }
      }).catch(err => {
        console.warn('Error loading API keys from file:', err);
        setOmdbApiKey(getConfig('omdbApiKey') || '');
        setTmdbApiKey(getConfig('tmdbApiKey') || '');
      });
    } else {
      setOmdbApiKey(getConfig('omdbApiKey') || '');
      setTmdbApiKey(getConfig('tmdbApiKey') || '');
    }
  }, [storage]);

  const updateApiKey = (key) => {
    setOmdbApiKey(key);
    saveConfig({ omdbApiKey: key });
    if (storage && storage.isConnected()) {
      saveAllSettings(storage, { omdbApiKey: key }).catch(err => console.warn('Error saving OMDb API key to file:', err));
    }
  };

  const updateTmdbApiKey = (key) => {
    setTmdbApiKey(key);
    saveConfig({ tmdbApiKey: key });
    if (storage && storage.isConnected()) {
      saveAllSettings(storage, { tmdbApiKey: key }).catch(err => console.warn('Error saving TMDB API key to file:', err));
    }
  };

  return {
    omdbApiKey,
    updateApiKey,
    hasApiKey: hasApiKey(),
    tmdbApiKey,
    updateTmdbApiKey,
  };
};