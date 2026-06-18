import React, { useState, useEffect } from 'react';
import { X, FolderOpen } from 'lucide-react';
import { getConfig, saveConfig } from '../../config.js';

const GoogleDriveConfigModal = ({ onClose, onConnect }) => {
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    // Load current folder name from config
    const currentFolder = getConfig('googleDriveFolderName') || 'MarkdownMediaTracker';
    setFolderName(currentFolder);
  }, []);

  const handleFolderNameChange = (e) => {
    const newName = e.target.value;
    setFolderName(newName);
  };

  const handleConnect = () => {
    // Save folder name to config
    const trimmedName = folderName.trim() || 'MarkdownMediaTracker';
    saveConfig({ googleDriveFolderName: trimmedName });
    
    // Trigger the connection
    onConnect();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gdriveconfig-modal-title"
        className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--mt-highlight-alpha)' }}
            >
              <FolderOpen className="w-5 h-5" style={{ color: 'var(--mt-highlight)' }} />
            </div>
            <div>
              <h3 id="gdriveconfig-modal-title" className="text-lg font-semibold text-white">Configure Google Drive</h3>
              <p className="text-sm text-slate-400">Choose your folder name</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={handleFolderNameChange}
              placeholder="MarkdownMediaTracker"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-opacity-50"
              style={{ 
                focusBorderColor: 'var(--mt-highlight)',
                focusRingColor: 'var(--mt-highlight)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--mt-highlight)';
                e.target.style.boxShadow = `0 0 0 1px var(--mt-highlight)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#475569'; // slate-600
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-400">
              This folder will be used in your Google Drive root directory to store your media files.
            </p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-3 mb-6">
            <h4 className="text-sm font-medium text-slate-300 mb-2">What happens next:</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Google will ask you to sign in and grant permissions</li>
              <li>• If it does not already exist, a folder named "{folderName || 'MarkdownMediaTracker'}" will be created</li>
              <li>• Your media files will be stored as .md files in this folder</li>
              <li>• You can access and edit these files from any device</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-600">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium"
            style={{ backgroundColor: 'var(--mt-highlight)' }}
            onMouseEnter={(e) => {
              e.target.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.filter = 'brightness(1)';
            }}
          >
            Connect to Google Drive
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveConfigModal;