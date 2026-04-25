import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';

const ObsidianBaseModal = ({ onClose, onCreate }) => {
  const [dontAsk, setDontAsk] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      await onCreate(dontAsk);
    } catch (error) {
      // Handle errors gracefully - don't throw to prevent unhandled rejections
      console.error('Error creating Obsidian Base:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5" style={{ color: 'var(--mt-highlight)' }} />
              <h2 className="text-lg font-semibold">Initialize Obsidian Base</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
            <p className="text-sm text-blue-200 mb-1"><strong>Create Obsidian Base File</strong></p>
            <p className="text-xs text-blue-200">Markdown Media Tracker was designed to be compatible with <a href="https://help.obsidian.md/bases" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Obsidian Bases</a>. This will create a file named <code>Markdown Media Tracker.base</code> in the root of your storage folder. If you don't use Obsidian, feel free to ignore this!</p>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} className="min-w-[16px] min-h-[16px]" />
              <span className="text-sm text-slate-300">Don't ask me again</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={creating} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg" style={{ backgroundColor: 'var(--mt-highlight)' }}>
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObsidianBaseModal;
