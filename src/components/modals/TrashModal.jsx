import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { toast } from '../../services/toastService.js';

/**
 * Modal for browsing and managing trash
 */
const TrashModal = ({ storageAdapter, onClose, onRestore }) => {
  const [trashedItems, setTrashedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  useEffect(() => {
    loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrash = async () => {
    if (!storageAdapter || !storageAdapter.isConnected()) {
      toast('Storage not connected', { type: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      const items = await storageAdapter.listTrash();
      setTrashedItems(items);
    } catch (error) {
      console.error('Error loading trash:', error);
      toast(`Error loading trash: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (item) => {
    try {
      setIsLoading(true);
      await storageAdapter.restoreFromTrash(item.filename);
      toast(`Restored "${item.title}"`, { type: 'success' });
      
      // Remove from local state
      setTrashedItems(prev => prev.filter(i => i.filename !== item.filename));
      
      // Notify parent to reload items
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error restoring item:', error);
      toast(`Error restoring item: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      setIsLoading(true);
      const deleteCount = await storageAdapter.emptyTrash();
      toast(`Permanently deleted ${deleteCount} item${deleteCount !== 1 ? 's' : ''}`, { type: 'success' });
      setTrashedItems([]);
      setShowEmptyConfirm(false);
    } catch (error) {
      console.error('Error emptying trash:', error);
      toast(`Error emptying trash: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full p-6 mt-4 mb-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Trash</h2>
            <p className="text-sm text-slate-400 mt-1">
              {trashedItems.length} {trashedItems.length === 1 ? 'item' : 'items'} in trash
            </p>
          </div>
          <div className="flex items-center gap-2">
            {trashedItems.length > 0 && (
              <button
                onClick={() => setShowEmptyConfirm(true)}
                disabled={isLoading}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
                title="Empty trash"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Empty Trash</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading && trashedItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading trash...</p>
          </div>
        ) : trashedItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trashedItems.map((item) => (
              <div
                key={item.filename}
                className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{item.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.type === 'book' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1 flex items-center gap-3">
                    <span>{item.type === 'book' ? item.author : item.director}</span>
                    {item.year && <span>({item.year})</span>}
                    <span className="text-slate-500">•</span>
                    <span>{formatDate(item.deletedAt)}</span>
                    {item.size && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span>{formatSize(item.size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(item)}
                  disabled={isLoading}
                  className="ml-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
                  title="Restore item"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm">Restore</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty Trash Confirmation Modal */}
        {showEmptyConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Empty Trash?
                  </h3>
                  <p className="text-sm text-slate-300">
                    This will permanently delete all {trashedItems.length} item{trashedItems.length !== 1 ? 's' : ''} in the trash. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowEmptyConfirm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmptyTrash}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isLoading ? 'Emptying...' : 'Empty Trash'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashModal;
