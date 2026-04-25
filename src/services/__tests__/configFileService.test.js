import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadConfigFromFile,
  saveConfigToFile,
  updateConfigValue,
  getConfigValue,
  mergeConfigs,
  getDefaultConfig
} from '../configFileService.js';

describe('configFileService', () => {
  let mockStorage;

  beforeEach(() => {
    // Create a mock storage adapter
    mockStorage = {
      isConnected: vi.fn(() => true),
      readFile: vi.fn(),
      writeFile: vi.fn()
    };
  });

  describe('loadConfigFromFile', () => {
    it('should return empty object if storage is not connected', async () => {
      mockStorage.isConnected.mockReturnValue(false);
      
      const result = await loadConfigFromFile(mockStorage);
      
      expect(result).toEqual({});
    });

    it('should return empty object if storage is null', async () => {
      const result = await loadConfigFromFile(null);
      
      expect(result).toEqual({});
    });

    it('should return empty object if file does not exist', async () => {
      mockStorage.readFile.mockResolvedValue(null);
      
      const result = await loadConfigFromFile(mockStorage);
      
      expect(result).toEqual({});
    });

    it('should parse and return config from file', async () => {
      const configData = {
        themePrimary: '#ff0000',
        themeHighlight: '#00ff00',
        cardSize: 'large'
      };
      mockStorage.readFile.mockResolvedValue(JSON.stringify(configData));
      
      const result = await loadConfigFromFile(mockStorage);
      
      expect(result).toEqual(configData);
      expect(mockStorage.readFile).toHaveBeenCalledWith('.mmt.config');
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockStorage.readFile.mockResolvedValue('invalid json {');
      
      const result = await loadConfigFromFile(mockStorage);
      
      expect(result).toEqual({});
    });

    it('should handle read errors gracefully', async () => {
      mockStorage.readFile.mockRejectedValue(new Error('Read error'));
      
      const result = await loadConfigFromFile(mockStorage);
      
      expect(result).toEqual({});
    });
  });

  describe('saveConfigToFile', () => {
    it('should return false if storage is not connected', async () => {
      mockStorage.isConnected.mockReturnValue(false);
      
      const result = await saveConfigToFile(mockStorage, { test: 'value' });
      
      expect(result).toBe(false);
    });

    it('should return false if storage is null', async () => {
      const result = await saveConfigToFile(null, { test: 'value' });
      
      expect(result).toBe(false);
    });

    it('should write config to file as JSON', async () => {
      mockStorage.writeFile.mockResolvedValue(undefined);
      const config = {
        themePrimary: '#ff0000',
        themeHighlight: '#00ff00'
      };
      
      const result = await saveConfigToFile(mockStorage, config);
      
      expect(result).toBe(true);
      expect(mockStorage.writeFile).toHaveBeenCalledWith(
        '.mmt.config',
        JSON.stringify(config, null, 2)
      );
    });

    it('should handle write errors gracefully', async () => {
      mockStorage.writeFile.mockRejectedValue(new Error('Write error'));
      
      const result = await saveConfigToFile(mockStorage, { test: 'value' });
      
      expect(result).toBe(false);
    });
  });

  describe('updateConfigValue', () => {
    it('should update a single config value', async () => {
      const existingConfig = { themePrimary: '#000000', cardSize: 'medium' };
      mockStorage.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockStorage.writeFile.mockResolvedValue(undefined);
      
      const result = await updateConfigValue(mockStorage, 'themePrimary', '#ff0000');
      
      expect(result).toBe(true);
      expect(mockStorage.writeFile).toHaveBeenCalledWith(
        '.mmt.config',
        JSON.stringify({ ...existingConfig, themePrimary: '#ff0000' }, null, 2)
      );
    });

    it('should add new config value if it does not exist', async () => {
      mockStorage.readFile.mockResolvedValue(JSON.stringify({}));
      mockStorage.writeFile.mockResolvedValue(undefined);
      
      const result = await updateConfigValue(mockStorage, 'newKey', 'newValue');
      
      expect(result).toBe(true);
      expect(mockStorage.writeFile).toHaveBeenCalledWith(
        '.mmt.config',
        JSON.stringify({ newKey: 'newValue' }, null, 2)
      );
    });

    it('should return false if storage is not connected', async () => {
      mockStorage.isConnected.mockReturnValue(false);
      
      const result = await updateConfigValue(mockStorage, 'key', 'value');
      
      expect(result).toBe(false);
    });
  });

  describe('getConfigValue', () => {
    it('should return config value from file', async () => {
      const config = { themePrimary: '#ff0000', cardSize: 'large' };
      mockStorage.readFile.mockResolvedValue(JSON.stringify(config));
      
      const result = await getConfigValue(mockStorage, 'themePrimary');
      
      expect(result).toBe('#ff0000');
    });

    it('should return default value if key not found', async () => {
      mockStorage.readFile.mockResolvedValue(JSON.stringify({}));
      
      const result = await getConfigValue(mockStorage, 'nonexistent', 'default');
      
      expect(result).toBe('default');
    });

    it('should return null default if not specified', async () => {
      mockStorage.readFile.mockResolvedValue(JSON.stringify({}));
      
      const result = await getConfigValue(mockStorage, 'nonexistent');
      
      expect(result).toBeNull();
    });

    it('should handle errors and return default value', async () => {
      mockStorage.readFile.mockRejectedValue(new Error('Read error'));
      
      const result = await getConfigValue(mockStorage, 'key', 'fallback');
      
      expect(result).toBe('fallback');
    });
  });

  describe('mergeConfigs', () => {
    it('should merge configs with file config taking priority', () => {
      const localConfig = {
        themePrimary: '#000000',
        themeHighlight: '#ffffff',
        cardSize: 'small'
      };
      const fileConfig = {
        themePrimary: '#ff0000',
        halfStarsEnabled: true
      };
      
      const result = mergeConfigs(localConfig, fileConfig);
      
      expect(result).toEqual({
        themePrimary: '#ff0000', // from file
        themeHighlight: '#ffffff', // from local
        cardSize: 'small', // from local
        halfStarsEnabled: true // from file
      });
    });

    it('should handle empty configs', () => {
      const result = mergeConfigs({}, {});
      
      expect(result).toEqual({});
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const defaults = getDefaultConfig();
      
      expect(defaults).toHaveProperty('themePrimary');
      expect(defaults).toHaveProperty('themeHighlight');
      expect(defaults).toHaveProperty('cardSize');
      expect(defaults).toHaveProperty('halfStarsEnabled');
      expect(defaults).toHaveProperty('omdbApiKey');
      expect(defaults.cardSize).toBe('medium');
      expect(defaults.halfStarsEnabled).toBe(true);
    });
  });
});
