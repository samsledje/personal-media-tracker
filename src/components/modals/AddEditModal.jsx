import React, { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import EditForm from '../forms/EditForm.jsx';
import { STATUS_TYPES } from '../../constants/index.js';
import { toast } from '../../services/toastService.js';
import { isDuplicate } from '../../utils/commonUtils.js';

/**
 * Modal for adding new items
 */
const AddEditModal = ({ onClose, onSave, onDuplicate, initialItem = null, allTags = [], allItems = [] }) => {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if this is from search results
  const fromSearch = initialItem && (initialItem.dateAdded && initialItem.dateAdded !== '');

  const [item, setItem] = useState(initialItem || {
    title: '',
    type: 'book',
    status: STATUS_TYPES.BOOK.TO_READ, // Default status for new books
    author: '',
    director: '',
    actors: [],
    isbn: '',
    year: '',
    rating: 0,
    tags: [],
    coverUrl: '',
    // Only set appropriate date based on type, not both
    ...(initialItem?.type === 'movie' 
      ? { dateWatched: getTodayDate() } 
      : { dateRead: getTodayDate() }
    ),
    dateAdded: new Date().toISOString(),
    review: ''
  });

  // Update item when initialItem changes
  useEffect(() => {
    if (initialItem) {
      // Ensure initialItem has a default status if not present
      const updatedItem = {
        ...initialItem,
        status: initialItem.status || (initialItem.type === 'book' ? STATUS_TYPES.BOOK.READ : STATUS_TYPES.MOVIE.WATCHED)
      };
      setItem(updatedItem);
    }
  }, [initialItem]);

  // Handle status updates when type changes in the form
  useEffect(() => {
    if (!item.status || 
        (item.type === 'book' && !Object.values(STATUS_TYPES.BOOK).includes(item.status)) ||
        (item.type === 'movie' && !Object.values(STATUS_TYPES.MOVIE).includes(item.status))) {
      const newStatus = item.type === 'book' ? STATUS_TYPES.BOOK.TO_READ : STATUS_TYPES.MOVIE.TO_WATCH;
      setItem(prev => ({ ...prev, status: newStatus }));
    }
  }, [item.type]);

  const modalRef = useRef(null);

  const handleSave = () => {
    if (!item.title) {
      toast('Title is required', { type: 'error' });
      return;
    }
    const duplicate = allItems.find((it) => isDuplicate([it], item));
    if (duplicate) {
      toast(`"${item.title}" is already in your library`, { type: 'warning' });
      onDuplicate?.(duplicate);
      return;
    }
    onSave(item);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item]);

  // Focus trapping
  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      // Get all focusable elements within the modal
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if focused on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if focused on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  // Auto-focus the first focusable element when modal opens
  useEffect(() => {
    // Removed auto-focus to prevent keyboard popup on mobile
    // Focus will be managed by individual form components if needed
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="addedit-modal-title"
        className="bg-slate-800 border border-slate-700 rounded-lg w-full h-full sm:max-w-2xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 id="addedit-modal-title" className="text-lg sm:text-xl font-bold">Add New Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 pb-6">
          <EditForm item={item} onChange={setItem} fromSearch={fromSearch} allTags={allTags} />
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg transition min-h-[44px] order-2 sm:order-1"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'white' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px] order-1 sm:order-2"
              style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
            >
              <Save className="w-4 h-4" />
              Save Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditModal;