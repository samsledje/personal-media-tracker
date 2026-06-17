import React, { useRef, useEffect } from 'react';
import { Book, Film, Tag, Calendar, User, Hash, Bookmark, BookOpen, CheckCircle, PlayCircle, Layers, Image, XCircle, ChevronDown } from 'lucide-react';
import { STATUS_LABELS, STATUS_ICONS, STATUS_COLORS } from '../../constants/index.js';
import StarRating from '../StarRating.jsx';
import { renderMarkdown } from '../../utils/markdownUtils.js';

/**
 * Component for displaying item details in read-only view
 */
const ViewDetails = ({ item, hexToRgba, highlightColor, hideRating = false, onFetchCover = null, isFetchingCover = false, onRatingChange = null, onStatusChange = null, currentStatus = null, getStatusColor = null, getStatusIcon = null, STATUS_LABELS = {}, halfStarsEnabled = false, showStatusMenu = false, onStatusMenuSelect = null, statusOptions = [], onCloseStatusMenu = null }) => {
  const statusMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        onCloseStatusMenu?.();
      }
    };

    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusMenu, onCloseStatusMenu]);
  return (
    <div className="space-y-4">
      {item.coverUrl ? (
        <div className="flex justify-center mb-6">
          <img
            src={item.coverUrl}
            alt={item.title}
            className="max-w-xs rounded-lg shadow-lg"
          />
        </div>
      ) : onFetchCover && (
        <div className="flex justify-center mb-6">
          <div className="max-w-xs w-full bg-slate-700/30 rounded-lg p-8 flex flex-col items-center gap-4">
            <Image className="w-16 h-16 text-slate-500" />
            <p className="text-slate-400 text-sm text-center">No cover image available</p>
            <button
              onClick={onFetchCover}
              disabled={isFetchingCover}
              className="px-4 py-2 rounded transition text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
            >
              <Image className="w-4 h-4" />
              {isFetchingCover ? 'Fetching...' : 'Fetch Cover'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {item.type === 'book' ? (
            <Book className="w-12 h-12 text-blue-400" />
          ) : (
            <Film className="w-12 h-12 text-purple-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-400 uppercase tracking-wide mb-1">
            {item.type}
          </div>
          {/* status removed here — handled via modal quick actions / badge */}
          <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
          {item.author && (
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4" />
              <span>{item.author}</span>
            </div>
          )}
          {item.director && (
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4" />
              <span>{item.director}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rating and Status section - prominently placed after basic info */}
      {(onRatingChange || currentStatus) && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Rating section */}
            {onRatingChange && (
              <div className="flex-1 max-w-xs">
                <StarRating
                  rating={item.rating ? item.rating : undefined}
                  onChange={onRatingChange}
                  interactive={true}
                  halfStarsEnabled={halfStarsEnabled}
                  size="w-7 h-7 sm:w-8 sm:h-8"
                />
              </div>
            )}

            {/* Status section */}
            {currentStatus && getStatusColor && getStatusIcon && STATUS_LABELS && (
              <div className="flex-shrink-0 relative flex items-center gap-1 sm:gap-2">
                {/* Status indicator (not a button) */}
                <div
                  className="flex-none p-0 leading-none min-h-0 flex items-center justify-center rounded-full text-white shadow-lg w-8 h-8 sm:w-10 sm:h-10"
                  style={{ backgroundColor: getStatusColor(currentStatus) }}
                  title={STATUS_LABELS[currentStatus]}
                >
                  {getStatusIcon(currentStatus, 'w-4 h-4 sm:w-5 sm:h-5')}
                </div>

                {/* Chevron button to open menu */}
                {onStatusChange && (
                  <button
                    type="button"
                    onClick={onStatusChange}
                    className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors border border-slate-700 ml-1"
                    title="Change status"
                  >
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  </button>
                )}

                {/* Status menu */}
                {showStatusMenu && statusOptions && onStatusMenuSelect && (
                  <div
                    ref={statusMenuRef}
                    className="absolute right-0 bottom-full mb-1 sm:mb-2 w-48 sm:w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 sm:p-2 z-[200] pointer-events-auto max-w-[calc(100vw-2rem)]"
                  >
                    {statusOptions.map(status => (
                      <button
                        key={status}
                        onClick={() => onStatusMenuSelect(status)}
                        className={`flex items-center gap-2 sm:gap-3 w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-slate-700/50 ${currentStatus === status ? 'bg-slate-700/60' : ''}`}
                      >
                        <div className="flex items-center justify-center rounded-full p-1.5 sm:p-2 text-white flex-shrink-0" style={{ backgroundColor: getStatusColor(status) }}>
                          {getStatusIcon(status, 'w-3 h-3 sm:w-4 sm:h-4')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium truncate">{STATUS_LABELS[status]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {item.type === 'movie' && item.actors && item.actors.length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-400 mb-2">Cast</div>
          <div className="flex flex-wrap gap-2">
            {item.actors.map((actor) => (
              <span
                key={actor}
                className="px-3 py-1 bg-slate-700 rounded-full text-sm"
              >
                {actor}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.isbn && (
        <div className="flex items-center gap-2 text-slate-300">
          <Hash className="w-4 h-4" />
          <span className="text-sm">ISBN: {item.isbn}</span>
        </div>
      )}

      {item.year && (
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Year: {item.year}</span>
        </div>
      )}

      {item.dateRead && (
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Read on {new Date(item.dateRead).toLocaleDateString()}</span>
        </div>
      )}

      {item.dateWatched && (
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Watched on {new Date(item.dateWatched).toLocaleDateString()}</span>
        </div>
      )}

      {item.rating > 0 && !hideRating && (
        <div>
          <div className="text-sm font-medium text-slate-400 mb-2">Rating</div>
          <StarRating
            rating={item.rating}
            interactive={false}
            halfStarsEnabled={halfStarsEnabled}
            size="w-7 h-7 sm:w-8 sm:h-8"
          />
        </div>
      )}

      {item.tags && item.tags.length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: hexToRgba(highlightColor, 0.12),
                  color: 'white',
                  border: `1px solid ${hexToRgba(highlightColor, 0.12)}`
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.review && (
        <div>
          <div className="text-sm font-medium text-slate-400 mb-2">Review</div>
          <div
            className="bg-slate-700/30 rounded-lg p-4 prose-review"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(item.review) }}
          />
        </div>
      )}

      {item.dateAdded && (
        <div className="text-xs text-slate-500 mt-4">
          Added on {new Date(item.dateAdded).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default ViewDetails;
