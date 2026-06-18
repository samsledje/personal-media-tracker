import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, ChevronDown, Edit, Trash2 } from 'lucide-react';
import EditForm from '../forms/EditForm.jsx';
import ViewDetails from '../cards/ViewDetails.jsx';
import { STATUS_TYPES, KEYBOARD_SHORTCUTS } from '../../constants/index.js';
import { STATUS_LABELS } from '../../constants/index.js';
import { fetchCoverForItem } from '../../utils/coverUtils.js';
import { getStatusColor } from '../../utils/colorUtils.js';
import { getStatusIcon } from '../../utils/statusUtils.jsx';
import { toast } from '../../services/toastService.js';
import StarRating from '../StarRating.jsx';
import { useHalfStars } from '../../hooks/useHalfStars.js';

/**
 * Modal for viewing and editing item details
 */
const ItemDetailModal = ({ item, onClose, onSave, onDelete, onQuickSave, hexToRgba, highlightColor, items = [], onNavigate, allTags = [], initialEditMode = false }) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [halfStarsEnabled] = useHalfStars();

  // Ensure item has a status when creating editedItem
  const [editedItem, setEditedItem] = useState(() => {
    const defaultStatus = item.type === 'book' ? STATUS_TYPES.BOOK.READ : STATUS_TYPES.MOVIE.WATCHED;
    return {
      ...item,
      status: item.status || defaultStatus
    };
  });

  const modalRef = useRef(null);

  // Update editedItem when item prop changes
  useEffect(() => {
    const defaultStatus = item.type === 'book' ? STATUS_TYPES.BOOK.READ : STATUS_TYPES.MOVIE.WATCHED;
    const finalStatus = item.status || defaultStatus;

    setEditedItem({
      ...item,
      status: finalStatus
    });
  }, [item]);

  const handleSave = useCallback(() => {
    onSave(editedItem);
    setIsEditing(false);
  }, [onSave, editedItem]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(item);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleQuickStatusChange = useCallback((newStatus) => {
    // Save immediately and update local editedItem so UI updates
    const updated = { ...editedItem, status: newStatus };
    setEditedItem(updated);
    // Persist change via onQuickSave if provided, otherwise use onSave
    if (typeof onQuickSave === 'function') {
      onQuickSave(updated);
    } else {
      onSave(updated);
    }
    setShowStatusMenu(false);
  }, [editedItem, onQuickSave, onSave]);

  const handleStatusClick = useCallback(() => {
    setShowStatusMenu(v => !v);
  }, []);

  const handleQuickRatingChange = useCallback((newRating) => {
    const updated = { ...editedItem, rating: newRating };
    setEditedItem(updated);
    // Persist change via onQuickSave if provided, otherwise use onSave
    if (typeof onQuickSave === 'function') {
      onQuickSave(updated);
    } else {
      onSave(updated);
    }
  }, [editedItem, onQuickSave, onSave]);

  const handleFetchCover = async () => {
    setIsFetchingCover(true);
    try {
      const coverUrl = await fetchCoverForItem(editedItem);

      if (coverUrl) {
        const updated = { ...editedItem, coverUrl };
        setEditedItem(updated);

        // Persist the change
        if (typeof onQuickSave === 'function') {
          onQuickSave(updated);
        } else {
          onSave(updated);
        }

        toast('Cover image found and added!', { type: 'success' });
      } else {
        toast('No cover image found. Try adding one manually.', { type: 'info' });
      }
    } catch (error) {
      console.error('Error fetching cover:', error);

      // Handle specific error types
      if (error.message === 'API_KEY_MISSING') {
        toast('OMDb API key required for movie covers. Please configure in settings.', { type: 'error' });
      } else if (error.name === 'OpenLibraryError' || error.name === 'OMDBError') {
        toast(`Unable to fetch cover: ${error.message}`, { type: 'error' });
      } else {
        toast('Error fetching cover image. Please try again.', { type: 'error' });
      }
    } finally {
      setIsFetchingCover(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (isEditing) {
          e.preventDefault();
          handleSave();
        }
        return;
      }

      // Don't run shortcuts while typing in inputs/textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Quick status changes (U/I/O)
      if (!isEditing) {
        const statusOptions = editedItem.type === 'book' ? Object.values(STATUS_TYPES.BOOK) : Object.values(STATUS_TYPES.MOVIE);

        if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.STATUS_TO_READ_WATCH) {
          e.preventDefault();
          handleQuickStatusChange(statusOptions[0]); // To Read/Watch
          return;
        }
        if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.STATUS_IN_PROGRESS) {
          e.preventDefault();
          handleQuickStatusChange(statusOptions[1]); // Reading/Watching
          return;
        }
        if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.STATUS_COMPLETED) {
          e.preventDefault();
          handleQuickStatusChange(statusOptions[2]); // Read/Watched
          return;
        }
        if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.STATUS_DNF) {
          e.preventDefault();
          handleQuickStatusChange(statusOptions[3]); // DNF
          return;
        }
      }

      // Quick rating changes (0-5)
      if (!isEditing && [KEYBOARD_SHORTCUTS.RATING_CLEAR, KEYBOARD_SHORTCUTS.RATING_1, KEYBOARD_SHORTCUTS.RATING_2,
      KEYBOARD_SHORTCUTS.RATING_3, KEYBOARD_SHORTCUTS.RATING_4, KEYBOARD_SHORTCUTS.RATING_5].includes(e.key)) {
        e.preventDefault();
        const rating = parseInt(e.key);
        handleQuickRatingChange(rating);
        return;
      }

      // Toggle edit mode (E)
      if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.EDIT_MODE) {
        e.preventDefault();
        if (isEditing) {
          handleSave();
        } else {
          setIsEditing(true);
        }
        return;
      }

      // Delete item (D)
      if (!isEditing && e.key.toLowerCase() === KEYBOARD_SHORTCUTS.DELETE_ITEM) {
        e.preventDefault();
        handleDelete();
        return;
      }

      // Navigate to previous/next item (Arrow keys when not editing)
      if (!isEditing && items.length > 0 && onNavigate) {
        if (e.key === KEYBOARD_SHORTCUTS.ARROW_LEFT || e.key === KEYBOARD_SHORTCUTS.ARROW_UP) {
          e.preventDefault();
          const currentIndex = items.findIndex(i => i.id === item.id);
          if (currentIndex > 0) {
            onNavigate(items[currentIndex - 1]);
          }
          return;
        }
        if (e.key === KEYBOARD_SHORTCUTS.ARROW_RIGHT || e.key === KEYBOARD_SHORTCUTS.ARROW_DOWN) {
          e.preventDefault();
          const currentIndex = items.findIndex(i => i.id === item.id);
          if (currentIndex < items.length - 1) {
            onNavigate(items[currentIndex + 1]);
          }
          return;
        }
      }
    };

    const onClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [isEditing, editedItem, onClose, items, item, onNavigate, handleQuickRatingChange, handleQuickStatusChange, handleSave, handleStatusClick]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div
        ref={modalRef}
        className="bg-slate-800 border border-slate-700 rounded-lg w-full h-full sm:max-w-2xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold truncate flex-1">{item.title}</h2>
          </div>
          {/* Right-side controls: action buttons only */}
          <div className="flex gap-2 flex-shrink-0">
            {!isEditing ? (
              <>
                <button
                  onClick={handleDelete}
                  className="p-2 sm:p-1 rounded transition min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,0,0,0.16)', color: 'white' }}
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 sm:p-1 rounded transition min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--mt-highlight)' }}
                  title="Edit"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleSave}
                className="p-2 sm:p-1 rounded transition min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--mt-highlight)' }}
                title="Save"
              >
                <Save className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 sm:p-1 hover:bg-slate-700 rounded transition min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-6 relative">
          {isEditing ? (
            <EditForm item={editedItem} onChange={setEditedItem} allTags={allTags} />
          ) : (
            <div className="relative">
              <ViewDetails
                item={editedItem}
                hexToRgba={hexToRgba}
                highlightColor={highlightColor}
                hideRating={true}
                onFetchCover={handleFetchCover}
                isFetchingCover={isFetchingCover}
                onRatingChange={handleQuickRatingChange}
                onStatusChange={handleStatusClick}
                currentStatus={editedItem.status}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                STATUS_LABELS={STATUS_LABELS}
                halfStarsEnabled={halfStarsEnabled}
                showStatusMenu={showStatusMenu}
                onStatusMenuSelect={handleQuickStatusChange}
                statusOptions={editedItem.type === 'book' ? Object.values(STATUS_TYPES.BOOK) : Object.values(STATUS_TYPES.MOVIE)}
                onCloseStatusMenu={() => setShowStatusMenu(false)}
              />
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">Delete Item</h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete "{item.title}"? It can be recovered from the trash.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded transition text-sm text-white"
                  style={{ backgroundColor: 'rgba(255,0,0,0.8)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailModal;
