import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Cloud, FolderOpen, Folder, User, Wifi, WifiOff, ArrowLeft } from 'lucide-react';

/**
 * Compact Storage Indicator Component
 * Shows storage status in bottom right, expandable on click
 */
const StorageIndicator = forwardRef(({ storageAdapter, storageInfo, onSwitchStorage, onOpenChange }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openModal: () => setIsExpanded(true),
    closeModal: () => setIsExpanded(false),
    toggleModal: () => setIsExpanded(prev => !prev),
    isOpen: () => isExpanded
  }));

  // Notify the parent whenever the open state changes, so it can react without
  // polling the imperative handle.
  useEffect(() => {
    onOpenChange?.(isExpanded);
  }, [isExpanded, onOpenChange]);

  // Handle keyboard shortcuts when modal is open
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e) => {
      // Cmd+Enter or Ctrl+Enter: trigger switch storage
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        setIsExpanded(false);
        onSwitchStorage();
        return;
      }
      
      // Escape: close modal
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsExpanded(false);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onSwitchStorage]);

  if (!storageAdapter) return null;

  const isConnected = storageAdapter.isConnected();
  const storageType = storageAdapter.getStorageType();

  const getIcon = () => {
    if (storageType === 'googledrive') {
      return isConnected ? <Cloud className="w-4 h-4" /> : <Cloud className="w-4 h-4 opacity-50" />;
    }
    return isConnected ? <FolderOpen className="w-4 h-4" /> : <FolderOpen className="w-4 h-4 opacity-50" />;
  };

  const getStatusIcon = () => {
    return isConnected ? 
      <Wifi className="w-3 h-3 text-green-400" /> : 
      <WifiOff className="w-3 h-3 text-red-400" />;
  };

  const getStatusColor = () => {
    if (!isConnected) return 'border-red-500/30 bg-red-500/10';
    if (storageType === 'googledrive') return 'border-blue-500/30 bg-blue-500/10';
    return 'border-green-500/30 bg-green-500/10';
  };

  const getDisplayName = () => {
    if (!isConnected) return 'Disconnected';
    if (storageType === 'googledrive') return 'Google Drive';
    return 'Local Files';
  };

  const getAccountAndFolder = () => {
    if (!storageInfo) return { account: null, folder: 'No storage connected' };
    return storageInfo;
  };

  const { account, folder } = getAccountAndFolder();

  return (
    <div className="relative">
      {/* Compact indicator button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all duration-200
          ${getStatusColor()}
          hover:bg-opacity-20 active:scale-95
        `}
        title={`Storage: ${getDisplayName()}`}
      >
        {getIcon()}
        {getStatusIcon()}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Panel */}
          <div className="absolute bottom-full right-0 mb-2 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className={`px-4 py-3 border-b border-slate-600 ${
              storageType === 'googledrive' ? 'bg-blue-500/10' : 'bg-green-500/10'
            }`}>
              <div className="flex items-center gap-2">
                {getIcon()}
                <div className="flex-1">
                  <div className="font-medium text-white">{getDisplayName()}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-300">
                    {getStatusIcon()}
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Storage info */}
              {account && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Account</div>
                  <div className="text-sm text-slate-200 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="truncate">{account}</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-400 mb-1">{account ? 'Folder' : 'Location'}</div>
                <div className="text-sm text-slate-200 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  <span className="truncate">{folder}</span>
                </div>
              </div>

              {/* Storage type info */}
              <div>
                <div className="text-xs text-slate-400 mb-1">Type</div>
                <div className="text-sm text-slate-200">
                  {storageType === 'googledrive' ? 'Cloud Storage' : 'Local Storage'}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-600 space-y-2">
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onSwitchStorage();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Switch Storage
                </button>
                
                {/* Keyboard hint */}
                <div className="text-xs text-slate-400 text-center">
                  Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">⌘Enter</kbd> or <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">Ctrl+Enter</kbd> to switch
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default StorageIndicator;