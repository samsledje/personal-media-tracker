import { useState, useEffect } from 'react';
import { loadHalfStarsEnabled, saveHalfStarsEnabled, loadAllSettings, saveAllSettings } from '../services/configService.js';

/**
 * Custom hook for managing half stars setting
 * @param {StorageAdapter} storage - Storage adapter instance (optional)
 * @returns {[boolean, function]} [halfStarsEnabled, setHalfStarsEnabled]
 */
export const useHalfStars = (storage = null) => {
  const [halfStarsEnabled, setHalfStarsEnabledState] = useState(() => loadHalfStarsEnabled());

  const setHalfStarsEnabled = (enabled) => {
    setHalfStarsEnabledState(enabled);
    saveHalfStarsEnabled(enabled);
    // Also save to file if storage is available
    if (storage && storage.isConnected()) {
      saveAllSettings(storage, { halfStarsEnabled: enabled }).catch(err => console.warn('Error saving half stars to file:', err));
    }
  };

  // Load on mount and when storage changes
  useEffect(() => {
    if (storage && storage.isConnected()) {
      loadAllSettings(storage).then(settings => {
        if (settings.halfStarsEnabled !== undefined) {
          setHalfStarsEnabledState(settings.halfStarsEnabled);
        }
      }).catch(err => {
        console.warn('Error loading half stars setting from file:', err);
      });
    } else {
      const enabled = loadHalfStarsEnabled();
      setHalfStarsEnabledState(enabled);
    }
  }, [storage]);

  return [halfStarsEnabled, setHalfStarsEnabled];
};
