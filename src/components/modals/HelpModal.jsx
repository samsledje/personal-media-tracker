import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal displaying keyboard shortcuts help
 */
const HelpModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full p-6 mt-4 mb-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="help-modal-title" className="text-xl font-bold">Keyboard shortcuts</h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Global</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li><strong>?</strong> — Show/hide this help</li>
              <li><strong>/</strong> or <strong>Ctrl/Cmd+K</strong> — Focus search (Esc to clear/unfocus)</li>
              <li><strong>Esc</strong> — Close modals / clear search / exit selection</li>
              <li><strong>T</strong> — Show storage switch pane (Cmd+Enter to confirm)</li>
              <li><strong>N</strong> — Add manually (when storage connected)</li>
              <li><strong>S</strong> — Search online (when storage connected)</li>
              <li><strong>F</strong> — Toggle filters</li>
              <li><strong>C</strong> — Open Settings</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">When browsing items</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li><strong>Arrow keys</strong> or <strong>H/J/K/L</strong> — Navigate between item cards</li>
              <li><strong>Enter / Space</strong> — Open selected item</li>
              <li><strong>A</strong> — Show all items</li>
              <li><strong>B</strong> — Filter to books only</li>
              <li><strong>M</strong> — Filter to movies only</li>
              <li><strong>V</strong> — Toggle selection mode</li>
              <li><strong>Ctrl/Cmd+A</strong> — Select all visible (in selection mode)</li>
              <li><strong>Delete / Backspace</strong> — Delete selected (in selection mode)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">In search modal</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li><strong>Esc</strong> — Close modal</li>
              <li><strong>/</strong> or <strong>Ctrl/Cmd+K</strong> — Focus search input</li>
              <li><strong>B</strong> — Switch to book search</li>
              <li><strong>M</strong> — Switch to movie search</li>
              <li><strong>↓</strong> — Exit search input, focus first result</li>
              <li><strong>Arrow keys</strong> — Navigate search results</li>
              <li><strong>Enter / Space</strong> — Select focused result</li>
              <li><strong>Ctrl/Cmd+Enter</strong> — Search with current query</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">In item detail modal</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li><strong>Esc</strong> — Close modal</li>
              <li><strong>E</strong> — Toggle edit mode</li>
              <li><strong>D</strong> — Delete item</li>
              <li><strong>U</strong> — To Read/Watch status</li>
              <li><strong>I</strong> — Reading/Watching status</li>
              <li><strong>O</strong> — Read/Watched status</li>
              <li><strong>0-5</strong> — Set rating (0 = unrated)</li>
              <li><strong>Ctrl/Cmd+Enter</strong> — Save (when editing)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;