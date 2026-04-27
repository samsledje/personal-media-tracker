import React, { useState, useEffect } from 'react';
import { X, Settings, ExternalLink, Save } from 'lucide-react';
import { PRIMARY_COLOR_PRESETS, HIGHLIGHT_COLOR_PRESETS } from '../../constants/colors.js';

const TABS = ['Appearance', 'General', 'API Keys'];
const CARD_SIZES = ['tiny', 'small', 'medium', 'large', 'xlarge'];

const SettingsModal = ({
  onClose,
  initialTab = 'Appearance',
  // Appearance
  primaryColor,
  highlightColor,
  cardSize,
  updatePrimaryColor,
  updateHighlightColor,
  updateCardSize,
  resetTheme,
  // General
  halfStarsEnabled,
  setHalfStarsEnabled,
  storageAdapter,
  onClearCache,
  // API Keys
  omdbApiKey,
  updateApiKey,
  tmdbApiKey,
  updateTmdbApiKey,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [apiKeyInput, setApiKeyInput] = useState(omdbApiKey || '');
  const [showApiKeySaved, setShowApiKeySaved] = useState(false);
  const [tmdbKeyInput, setTmdbKeyInput] = useState(tmdbApiKey || '');
  const [showTmdbKeySaved, setShowTmdbKeySaved] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    updateApiKey(trimmed);
    setShowApiKeySaved(true);
    setTimeout(() => setShowApiKeySaved(false), 2000);
  };

  const handleSaveTmdbKey = () => {
    const trimmed = tmdbKeyInput.trim();
    updateTmdbApiKey(trimmed);
    setShowTmdbKeySaved(true);
    setTimeout(() => setShowTmdbKeySaved(false), 2000);
  };

  const isGoogleDrive = storageAdapter?.getStorageType() === 'googledrive';
  const cardSizeIndex = CARD_SIZES.indexOf(cardSize);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: 'var(--mt-highlight)' }} />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button onClick={onClose} aria-label="Close settings" className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={activeTab === tab
                ? { backgroundColor: 'var(--mt-highlight)', color: 'white' }
                : { color: '#94a3b8' }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto min-h-[320px]">

          {/* Appearance Tab */}
          {activeTab === 'Appearance' && (
            <div className="space-y-5">
              {/* Card Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Card Size: {cardSize.charAt(0).toUpperCase() + cardSize.slice(1)}
                </label>
                <div className="px-1">
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={cardSizeIndex}
                    onChange={(e) => updateCardSize(CARD_SIZES[parseInt(e.target.value)])}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--mt-highlight) 0%, var(--mt-highlight) ${(cardSizeIndex / 4) * 100}%, #475569 ${(cardSizeIndex / 4) * 100}%, #475569 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Tiny</span>
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                    <span>X-Large</span>
                  </div>
                </div>
              </div>

              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Primary Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRIMARY_COLOR_PRESETS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => updatePrimaryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${primaryColor === color ? 'border-white shadow-lg' : 'border-slate-600 hover:border-slate-400'}`}
                      style={{ backgroundColor: color }}
                      title={`Primary preset ${i + 1}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => updatePrimaryColor(e.target.value)}
                    className="w-12 h-8 rounded border border-slate-600 hover:border-slate-400 cursor-pointer bg-transparent"
                    title="Custom primary color"
                  />
                </div>
              </div>

              {/* Highlight Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Highlight Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {HIGHLIGHT_COLOR_PRESETS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => updateHighlightColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${highlightColor === color ? 'border-white shadow-lg' : 'border-slate-600 hover:border-slate-400'}`}
                      style={{ backgroundColor: color }}
                      title={`Highlight preset ${i + 1}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => updateHighlightColor(e.target.value)}
                    className="w-12 h-8 rounded border border-slate-600 hover:border-slate-400 cursor-pointer bg-transparent"
                    title="Custom highlight color"
                  />
                </div>
              </div>

              {/* Reset */}
              <div className="pt-1">
                <button
                  onClick={resetTheme}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'General' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Half Star Ratings</p>
                  <p className="text-xs text-slate-400 mt-0.5">Allow ratings like 3.5 stars</p>
                </div>
                <button
                  onClick={() => setHalfStarsEnabled(!halfStarsEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${halfStarsEnabled ? 'bg-blue-600' : 'bg-slate-600'}`}
                  aria-label="Toggle half star ratings"
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${halfStarsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {isGoogleDrive && (
                <div className="flex items-center justify-between py-2 border-t border-slate-700">
                  <div>
                    <p className="text-sm font-medium">Google Drive Cache</p>
                    <p className="text-xs text-slate-400 mt-0.5">Force a fresh reload of all items</p>
                  </div>
                  <button
                    onClick={() => { onClearCache(); onClose(); }}
                    className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors shrink-0"
                  >
                    Clear Cache
                  </button>
                </div>
              )}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'API Keys' && (
            <div className="space-y-4">
              {!omdbApiKey && (
                <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                  <p className="text-sm text-blue-200 font-medium mb-1">Movie search requires an API key</p>
                  <p className="text-xs text-blue-200">Get a free key at OMDb — takes about a minute.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">OMDb API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && apiKeyInput.trim()) handleSaveApiKey(); }}
                  placeholder="Enter your OMDb API key"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus={activeTab === 'API Keys'}
                />
                <p className="text-xs text-slate-400 mt-1">Used for movie searches. Synced to your storage directory.</p>
              </div>

              {showApiKeySaved && (
                <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                  <p className="text-sm text-green-200">✓ API key saved</p>
                </div>
              )}

              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: apiKeyInput.trim() ? 'var(--mt-highlight)' : undefined }}
              >
                <Save className="w-4 h-4" />
                Save Key
              </button>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300 font-medium mb-2">Don't have a key?</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400">
                  <li>
                    Visit{' '}
                    <a
                      href="http://www.omdbapi.com/apikey.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      omdbapi.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Enter your email and request a free key</li>
                  <li>Check your email and paste the key above</li>
                </ol>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <label className="block text-sm font-medium mb-1">
                  TMDB API Key{' '}
                  <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Enables searching by director or actor name (e.g. "Christopher Nolan").
                </p>
                <input
                  type="password"
                  value={tmdbKeyInput}
                  onChange={(e) => setTmdbKeyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && tmdbKeyInput.trim()) handleSaveTmdbKey(); }}
                  placeholder="Enter your TMDB API key"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {showTmdbKeySaved && (
                <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                  <p className="text-sm text-green-200">✓ TMDB key saved</p>
                </div>
              )}

              <button
                onClick={handleSaveTmdbKey}
                disabled={!tmdbKeyInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: tmdbKeyInput.trim() ? 'var(--mt-highlight)' : undefined }}
              >
                <Save className="w-4 h-4" />
                Save TMDB Key
              </button>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300 font-medium mb-2">Get a free TMDB key</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400">
                  <li>
                    Visit{' '}
                    <a
                      href="https://www.themoviedb.org/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      themoviedb.org <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Create a free account</li>
                  <li>Go to Settings → API and request an API key</li>
                  <li>Paste the key above</li>
                </ol>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
