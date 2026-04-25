import { describe, it, expect, beforeEach, vi } from 'vitest';

// config.js reads localStorage at module load time, so we must mock before importing
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _store: () => store,
  };
})();

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });

describe('config', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.resetModules();
  });

  it('initializes with defaults when localStorage is empty', async () => {
    const { config } = await import('../config.js');
    expect(config.omdbApiKey).toBe('');
    expect(config.googleDriveFolderName).toBe('MarkdownMediaTracker');
  });

  it('initializes from localStorage if values are stored', async () => {
    mockLocalStorage.setItem('mediaTracker_config', JSON.stringify({ omdbApiKey: 'stored-key' }));
    const { config } = await import('../config.js');
    expect(config.omdbApiKey).toBe('stored-key');
  });

  it('saveConfig persists to localStorage and updates runtime config', async () => {
    const { saveConfig, config } = await import('../config.js');
    const result = saveConfig({ omdbApiKey: 'new-key' });
    expect(result).toBe(true);
    expect(config.omdbApiKey).toBe('new-key');
    const stored = JSON.parse(mockLocalStorage.getItem('mediaTracker_config'));
    expect(stored.omdbApiKey).toBe('new-key');
  });

  it('saveConfig merges with existing config', async () => {
    mockLocalStorage.setItem('mediaTracker_config', JSON.stringify({ omdbApiKey: 'existing', googleDriveFolderName: 'MyFolder' }));
    const { saveConfig, config } = await import('../config.js');
    saveConfig({ omdbApiKey: 'updated' });
    const stored = JSON.parse(mockLocalStorage.getItem('mediaTracker_config'));
    expect(stored.googleDriveFolderName).toBe('MyFolder');
    expect(stored.omdbApiKey).toBe('updated');
  });

  it('saveConfig returns false on localStorage error', async () => {
    mockLocalStorage.setItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
    const { saveConfig } = await import('../config.js');
    const result = saveConfig({ omdbApiKey: 'key' });
    expect(result).toBe(false);
  });

  it('getConfig returns the value for a given key', async () => {
    const { getConfig, saveConfig } = await import('../config.js');
    saveConfig({ omdbApiKey: 'my-key' });
    expect(getConfig('omdbApiKey')).toBe('my-key');
  });

  it('hasApiKey returns false when no key is set', async () => {
    const { hasApiKey } = await import('../config.js');
    expect(hasApiKey()).toBe(false);
  });

  it('hasApiKey returns true when a key is set', async () => {
    const { saveConfig, hasApiKey } = await import('../config.js');
    saveConfig({ omdbApiKey: 'abc123' });
    expect(hasApiKey()).toBe(true);
  });

  it('handles corrupt localStorage gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValueOnce('not-valid-json');
    const { config } = await import('../config.js');
    expect(config.omdbApiKey).toBe('');
  });
});
