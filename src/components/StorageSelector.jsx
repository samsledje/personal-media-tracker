import React, { useState } from 'react';
import { FolderOpen, Cloud, Loader2 } from 'lucide-react';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
import GoogleDriveConfigModal from './modals/GoogleDriveConfigModal.jsx';

/**
 * Storage Selector Component
 * Allows users to choose between local files and Google Drive storage
 */
const StorageSelector = ({ onStorageSelect, availableOptions = [], error, isLoading, loadProgress }) => {
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);

  const getIcon = (type) => {
    switch (type) {
      case 'googledrive':
        return <Cloud className="w-8 h-8" />;
      case 'filesystem':
        return <FolderOpen className="w-8 h-8" />;
      default:
        return <FolderOpen className="w-8 h-8" />;
    }
  };

  return (
    <div className="text-center">
      {/* Loading Progress Indicator */}
      {isLoading && loadProgress && loadProgress.total > 0 && (
        <div className="mb-6 sm:mb-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <p className="text-lg font-medium text-blue-300">
              Loading your library...
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>{loadProgress.processed} / {loadProgress.total} files</span>
              <span>{Math.round((loadProgress.processed / loadProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(loadProgress.processed / loadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-6 sm:mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm leading-mobile">{error}</p>
          {error.includes('popup') && (
            <div className="mt-3 text-xs space-y-1 leading-mobile">
              <p className="font-medium">Troubleshooting tips:</p>
              <p>• Disable popup blockers for this site</p>
              <p>• On mobile: Allow popups in browser settings (Safari → Settings → Pop-ups)</p>
              <p>• Try using an incognito/private window</p>
              <p>• Clear browser cache and cookies</p>
            </div>
          )}
          {error.includes('authorized origins') && (
            <div className="mt-3 text-xs space-y-1 leading-mobile">
              <p className="font-medium">To fix this:</p>
              <p>• Go to Google Cloud Console → Credentials</p>
              <p>• Add http://localhost:5173 to authorized origins</p>
              <p>• See GOOGLE_DRIVE_SETUP.md for detailed instructions</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
        {availableOptions.map((option) => (
          <div key={option.type} className="flex">
            <button
              onClick={() => {
                if (!isLoading) {
                  if (option.type === 'googledrive') {
                    setShowGoogleDriveModal(true);
                  } else {
                    onStorageSelect(option.type);
                  }
                }
              }}
              disabled={!option.supported || isLoading}
              className={`
                w-full p-6 sm:p-8 rounded-xl border-2 transition-all duration-200 text-left flex flex-col min-h-[120px] sm:min-h-auto
                ${option.supported 
                  ? 'border-slate-600 hover:bg-slate-800/50 cursor-pointer' 
                  : 'border-slate-700 bg-slate-800/30 cursor-not-allowed opacity-50'
                }
                ${isLoading ? 'pointer-events-none opacity-50' : ''}
              `}
              onMouseEnter={(e) => {
                if (option.supported && !isLoading) {
                  e.currentTarget.style.borderColor = 'var(--mt-highlight)';
                }
              }}
              onMouseLeave={(e) => {
                if (option.supported && !isLoading) {
                  e.currentTarget.style.borderColor = '';
                }
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                {getIcon(option.type)}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">{option.name}</h3>
                  {!option.supported && option.type === 'filesystem' && (
                    <span className="text-sm text-amber-400">
                      {isMobile() ? 'Not available on mobile — use Google Drive' : 'Not supported on this browser'}
                    </span>
                  )}
                  {!option.supported && option.type !== 'filesystem' && (
                    <span className="text-sm text-red-400">Not supported on this device</span>
                  )}
                </div>
              </div>
              
              <p className="text-slate-300 text-sm sm:text-base leading-mobile mb-4 sm:mb-6">
                {option.description}
              </p>

            <div className="mt-auto space-y-2 text-xs sm:text-sm text-slate-400">
              {option.type === 'filesystem' && (
                <div className="space-y-1">
                  <p>✓ Files stored locally on your device</p>
                  <p>✓ Works offline</p>
                  <p>✓ Full control over your data</p>
                  <p className="text-amber-400">⚠ Desktop browsers only (Chrome, Edge, Opera)</p>
                </div>
              )}
              
              {option.type === 'googledrive' && (
                <div className="space-y-1">
                  <p>✓ Access from any device</p>
                  <p>✓ Automatic cloud backup</p>
                  <p>✓ Works on mobile devices</p>
                  <p className="text-blue-400">ℹ Requires Google account</p>
                  <p className="text-amber-400">⚠ Allow popups when prompted (check mobile browser settings)</p>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="mt-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="ml-2 text-sm">Connecting...</span>
              </div>
            )}
            </button>
          </div>
        ))}
      </div>

      {availableOptions.length === 0 && !isLoading && (
        <div className="mt-8 p-6 bg-slate-800/50 rounded-lg">
          <p className="text-slate-400">
            No storage options are available on this device. Please use a supported browser or check your configuration.
          </p>
        </div>
      )}

      <div className="mt-12 p-6 bg-slate-800/30 rounded-lg max-w-2xl mx-auto">
        <h4 className="text-lg font-semibold mb-3 text-white">Need help choosing?</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <p className="font-medium text-white mb-2">Choose Local Files if:</p>
            <ul className="space-y-1 text-xs">
              <li>• You primarily use desktop/laptop</li>
              <li>• You prefer local data control</li>
              <li>• You don't need mobile access</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-white mb-2">Choose Google Drive if:</p>
            <ul className="space-y-1 text-xs">
              <li>• You want mobile/tablet access</li>
              <li>• You use multiple devices</li>
              <li>• You want automatic backup</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Google Drive Configuration Modal */}
      {showGoogleDriveModal && (
        <GoogleDriveConfigModal
          onClose={() => setShowGoogleDriveModal(false)}
          onConnect={() => {
            setShowGoogleDriveModal(false);
            onStorageSelect('googledrive');
          }}
        />
      )}
    </div>
  );
};

export default StorageSelector;