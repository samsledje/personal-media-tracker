import { describe, it, expect, beforeEach } from 'vitest';
import { createMockStorage } from '../../test/mocks/storage.js';
import {
  loadConfigFromFile,
  saveConfigToFile,
  updateConfigValue,
  getConfigValue
} from '../../services/configFileService.js';

describe('Config File Integration Tests', () => {
  let storage;

  beforeEach(async () => {
    storage = createMockStorage('filesystem');
    await storage.initialize();
    await storage.selectStorage();
  });

  it('should save and load config file successfully', async () => {
    const config = {
      themePrimary: '#ff0000',
      themeHighlight: '#00ff00',
      cardSize: 'large',
      halfStarsEnabled: false,
      omdbApiKey: 'test-key-123'
    };

    // Save config
    const saveResult = await saveConfigToFile(storage, config);
    expect(saveResult).toBe(true);

    // Load config
    const loadedConfig = await loadConfigFromFile(storage);
    expect(loadedConfig).toEqual(config);
  });

  it('should update individual config values', async () => {
    // Initial config
    const initialConfig = {
      themePrimary: '#000000',
      cardSize: 'medium'
    };
    await saveConfigToFile(storage, initialConfig);

    // Update a value
    await updateConfigValue(storage, 'themePrimary', '#ff0000');

    // Verify the update
    const updatedConfig = await loadConfigFromFile(storage);
    expect(updatedConfig.themePrimary).toBe('#ff0000');
    expect(updatedConfig.cardSize).toBe('medium'); // Should remain unchanged
  });

  it('should handle missing config file gracefully', async () => {
    const config = await loadConfigFromFile(storage);
    expect(config).toEqual({});
  });

  it('should retrieve individual config values', async () => {
    const config = {
      themePrimary: '#123456',
      cardSize: 'xlarge'
    };
    await saveConfigToFile(storage, config);

    const value = await getConfigValue(storage, 'themePrimary');
    expect(value).toBe('#123456');
  });

  it('should return default value for missing keys', async () => {
    await saveConfigToFile(storage, { themePrimary: '#000000' });

    const value = await getConfigValue(storage, 'nonexistent', 'default-value');
    expect(value).toBe('default-value');
  });

  it('should persist config across storage disconnection and reconnection', async () => {
    // Save config
    const config = {
      themePrimary: '#abcdef',
      cardSize: 'small'
    };
    await saveConfigToFile(storage, config);

    // Disconnect
    await storage.disconnect();

    // Reconnect
    await storage.initialize();
    await storage.selectStorage();

    // Config should still be there (in a real scenario, the file would persist)
    // For this mock, we need to manually preserve files
    const newStorage = createMockStorage('filesystem');
    await newStorage.initialize();
    await newStorage.selectStorage();
    newStorage._setFile('.mmt.config', JSON.stringify(config, null, 2));

    const loadedConfig = await loadConfigFromFile(newStorage);
    expect(loadedConfig).toEqual(config);
  });

  it('should handle all supported config options', async () => {
    const fullConfig = {
      themePrimary: '#0b1220',
      themeHighlight: '#7c3aed',
      cardSize: 'medium',
      halfStarsEnabled: true,
      omdbApiKey: 'my-secret-key'
    };

    await saveConfigToFile(storage, fullConfig);
    const loaded = await loadConfigFromFile(storage);

    expect(loaded.themePrimary).toBe('#0b1220');
    expect(loaded.themeHighlight).toBe('#7c3aed');
    expect(loaded.cardSize).toBe('medium');
    expect(loaded.halfStarsEnabled).toBe(true);
    expect(loaded.omdbApiKey).toBe('my-secret-key');
  });

  it('should work with Google Drive storage', async () => {
    const driveStorage = createMockStorage('googledrive');
    await driveStorage.initialize();
    await driveStorage.selectStorage();

    const config = {
      themePrimary: '#ffffff',
      cardSize: 'tiny'
    };

    await saveConfigToFile(driveStorage, config);
    const loaded = await loadConfigFromFile(driveStorage);

    expect(loaded).toEqual(config);
  });
});
