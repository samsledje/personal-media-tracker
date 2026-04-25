import React, { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink } from 'lucide-react';
import { saveConfig, getConfig, hasApiKey } from '../../config.js';

const ApiKeyModal = ({ onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Load current API key
    const currentKey = getConfig('omdbApiKey');
    setApiKey(currentKey || '');
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    saveConfig({ omdbApiKey: trimmed });
    if (onSave) onSave(trimmed);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && apiKey.trim()) {
      handleSave();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [apiKey]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" style={{ color: 'var(--mt-highlight)' }} />
              <h2 className="text-lg font-semibold">API Key Management</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {!getConfig('omdbApiKey') && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-200 mb-1">
                <strong>🎉 Welcome to Markdown Media Tracker!</strong>
              </p>
              <p className="text-xs text-blue-200">
                To enable movie searches, you'll need a free OMDb API key. Don't worry - it takes just a minute to set up!
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">OMDb API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OMDb API key"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">
              Used for movie searches. Stored locally in your browser.
            </p>
          </div>

          {showSuccess && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
              <p className="text-sm text-green-200">
                ✓ API key saved successfully!
              </p>
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
            <p className="text-sm text-blue-200 mb-2">
              <strong>Don't have an API key?</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-blue-200">
              <li>
                Visit{' '}
                <a
                  href="http://www.omdbapi.com/apikey.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  OMDb API <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Enter your email and request a free API key</li>
              <li>Check your email for the API key</li>
              <li>Paste it above and click Save</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: apiKey.trim() ? 'var(--mt-highlight)' : undefined }}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;