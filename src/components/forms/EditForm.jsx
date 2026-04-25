import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { STATUS_TYPES, STATUS_LABELS } from '../../constants/index.js';
import TagInput from './TagInput.jsx';
import StarRating from '../StarRating.jsx';
import { useHalfStars } from '../../hooks/useHalfStars.js';
import { getStatusColor } from '../../utils/colorUtils.js';
import { autoUpdateDateOnStatusChange } from '../../utils/commonUtils.js';

/**
 * Form component for editing item details
 */
const EditForm = ({ item, onChange, fromSearch = false, allTags = [] }) => {
  const [tagInput, setTagInput] = useState('');
  const [actorInput, setActorInput] = useState('');
  const [halfStarsEnabled] = useHalfStars();
  const formRef = useRef(null);

  // Prevent auto-focusing when edit mode opens (mobile keyboard issue)
  useEffect(() => {
    // Only apply focus prevention on mobile devices where keyboard popup is an issue
    const isMobile = window.innerWidth < 768; // Tailwind's md breakpoint

    if (!isMobile) return;

    let cleanupFunctions = [];

    // Prevent focus on all inputs within this form for the first 100ms
    if (formRef.current) {
      const inputs = formRef.current.querySelectorAll('input, textarea');
      const preventFocus = (e) => {
        // Only prevent if this is likely an auto-focus (not from user interaction)
        if (!e.isTrusted) {
          e.preventDefault();
          e.target.blur();
        }
      };

      inputs.forEach(input => {
        input.addEventListener('focus', preventFocus, { capture: true, once: true });
        cleanupFunctions.push(() => input.removeEventListener('focus', preventFocus, { capture: true }));
      });
    }

    // Remove the focus prevention after 100ms
    const timer = setTimeout(() => {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions = [];
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  const handleTypeChange = (newType) => {
    if (fromSearch) return;

    // Update type and set appropriate default status
    const newStatus = newType === 'book' ? STATUS_TYPES.BOOK.TO_READ : STATUS_TYPES.MOVIE.TO_WATCH;
    onChange({ ...item, type: newType, status: newStatus });
  };

  const addTag = (tagToAdd) => {
    const tag = typeof tagToAdd === 'string' ? tagToAdd.trim() : tagInput.trim();
    if (tag && !item.tags.includes(tag)) {
      onChange({ ...item, tags: [...item.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    onChange({ ...item, tags: item.tags.filter(t => t !== tag) });
  };

  const addActor = () => {
    if (actorInput.trim() && !item.actors.includes(actorInput.trim())) {
      onChange({ ...item, actors: [...item.actors, actorInput.trim()] });
      setActorInput('');
    }
  };

  const removeActor = (actor) => {
    onChange({ ...item, actors: item.actors.filter(a => a !== actor) });
  };

  return (
    <div ref={formRef} className="space-y-4 sm:space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="flex gap-2">
          {['book', 'movie'].map(type => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              disabled={fromSearch}
              className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-lg transition capitalize min-h-[44px] ${item.type === type
                  ? ''
                  : fromSearch
                    ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              style={item.type === type ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
            >
              {type}
            </button>
          ))}
        </div>
        {fromSearch && (
          <p className="text-xs text-slate-500 mt-1">Type is set from search results and cannot be changed</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Status</label>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {(item.type === 'book' ? Object.values(STATUS_TYPES.BOOK) : Object.values(STATUS_TYPES.MOVIE)).map(status => {
            const isSelected = item.status === status;
            return (
              <button
                key={status}
                onClick={() => {
                  const updatedItem = autoUpdateDateOnStatusChange(item, status, item.status);
                  onChange(updatedItem);
                }}
                className={`px-4 py-3 sm:py-2 rounded-lg transition min-h-[44px] border-2 ${isSelected
                    ? 'text-white font-medium border-transparent'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-transparent hover:border-slate-500'
                  }`}
                style={isSelected ? {
                  backgroundColor: getStatusColor(status),
                  borderColor: getStatusColor(status)
                } : {}}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Title *</label>
        <input
          type="text"
          value={item.title}
          onChange={(e) => onChange({ ...item, title: e.target.value })}
          className="w-full px-3 py-3 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-base"
          placeholder="Enter title"
        />
      </div>

      {item.type === 'book' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Author</label>
            <input
              type="text"
              value={item.author || ''}
              onChange={(e) => onChange({ ...item, author: e.target.value })}
              className="w-full px-3 py-3 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              placeholder="Enter author name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">ISBN</label>
            <input
              type="text"
              value={item.isbn || ''}
              onChange={(e) => onChange({ ...item, isbn: e.target.value })}
              className="w-full px-3 py-3 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              placeholder="Enter ISBN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date read</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={item.dateRead || ''}
                onChange={(e) => onChange({ ...item, dateRead: e.target.value })}
                className="flex-1 px-3 py-3 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              />
              <button
                onClick={() => onChange({ ...item, dateRead: '' })}
                className="px-3 py-3 sm:py-2 rounded-lg transition text-sm min-h-[44px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'white' }}
                title="Clear date"
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}

      {item.type === 'movie' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Director</label>
            <input
              type="text"
              value={item.director || ''}
              onChange={(e) => onChange({ ...item, director: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter director name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Actors</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={actorInput}
                onChange={(e) => setActorInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (addActor(), e.preventDefault())}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Add actor"
              />
              <button
                onClick={addActor}
                className="px-4 py-2 rounded-lg transition"
                style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.actors.map((actor, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-slate-600 rounded-full text-sm flex items-center gap-2"
                >
                  {actor}
                  <button onClick={() => removeActor(actor)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date watched</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={item.dateWatched || ''}
                onChange={(e) => onChange({ ...item, dateWatched: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => onChange({ ...item, dateWatched: '' })}
                className="px-3 py-2 rounded-lg transition text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'white' }}
                title="Clear date"
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Year</label>
        <input
          type="number"
          value={item.year || ''}
          onChange={(e) => onChange({ ...item, year: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="Enter year"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <StarRating
          rating={item.rating || 0}
          onChange={(newRating) => onChange({ ...item, rating: newRating })}
          interactive={true}
          halfStarsEnabled={halfStarsEnabled}
          size="w-8 h-8"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <TagInput
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onAdd={addTag}
            existingTags={item.tags}
            allTags={allTags}
            placeholder="Add tag"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 rounded-lg transition"
            style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-slate-600 rounded-full text-sm flex items-center gap-2"
            >
              {tag}
              <button onClick={() => removeTag(tag)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Cover URL</label>
        <input
          type="text"
          value={item.coverUrl || ''}
          onChange={(e) => onChange({ ...item, coverUrl: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="Enter cover image URL"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Review</label>
        <textarea
          value={item.review || ''}
          onChange={(e) => onChange({ ...item, review: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="Write your review or notes here..."
        />
      </div>
    </div>
  );
};

export default EditForm;
