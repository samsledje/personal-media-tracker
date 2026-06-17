import React, { memo, useCallback } from 'react';
import { Book, Film, Star } from 'lucide-react';
import { hexToRgba } from '../../utils/colorUtils.js';
import { STATUS_LABELS } from '../../constants/index.js';
import { getStatusIcon, getStatusColorClass } from '../../utils/statusUtils.jsx';

/**
 * Memoized ItemCard component to prevent unnecessary re-renders
 */
const ItemCard = memo(({
  item,
  cardSize,
  highlightColor,
  selectionMode,
  selectedIds,
  focusedId,
  onItemClick,
  registerCardRef,
  halfStarsEnabled = true
}) => {
  // Do direct comparisons instead of function calls for performance
  const isSelected = selectedIds && selectedIds.has(item.id);
  const isFocused = focusedId === item.id;

  // Memoize click handler to prevent re-renders
  const handleClick = useCallback((e) => {
    onItemClick(item, e);
  }, [item, onItemClick]);

  // Helper to determine star fill state
  const getStarFill = useCallback((starIndex, rating) => {
    const starValue = starIndex + 1;
    if (rating >= starValue) {
      return 'full';
    } else if (halfStarsEnabled && rating >= starValue - 0.5) {
      return 'half';
    }
    return 'empty';
  }, [halfStarsEnabled]);

  const creator = item.author || item.director;
  const ariaLabel = `${item.title}${creator ? `, ${creator}` : ''}, ${item.type}${
    item.status ? `, ${STATUS_LABELS[item.status]}` : ''
  }${selectionMode ? (isSelected ? ', selected' : ', not selected') : ''}`;

  return (
    <div
      ref={(el) => registerCardRef(item.id, el)}
      onClick={handleClick}
      role="button"
      aria-label={ariaLabel}
      aria-pressed={selectionMode ? isSelected : undefined}
      className={`bg-slate-800/30 border rounded-lg overflow-hidden cursor-pointer transition-all relative w-full flex flex-col h-full ${
        isFocused ? 'ring-2 ring-blue-500' :
        isSelected ? 'ring-2 ring-yellow-500' :
        'border-slate-700 hover:border-slate-600'
      }`}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <div
            aria-hidden="true"
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            isSelected ? 'bg-yellow-500 border-yellow-500' : 'bg-slate-800 border-slate-400'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Cover image container (reserved space when missing) */}
      <div className={`${cardSize === 'tiny' ? 'h-24' : cardSize === 'small' ? 'h-36' : cardSize === 'large' ? 'h-48' : cardSize === 'xlarge' ? 'h-64' : 'h-40'} overflow-hidden bg-slate-800/10`}>
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className={`p-3 flex-1 flex flex-col ${cardSize === 'tiny' ? 'pb-12' : 'pb-14'}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold leading-tight mb-1 ${
              cardSize === 'tiny' ? 'text-xs' : cardSize === 'small' ? 'text-sm' : 'text-base'
            }`}>
              <span className="line-clamp-2">{item.title}</span>
            </h3>
            {(item.author || item.director) && (
              <p className={`text-slate-400 truncate ${
                cardSize === 'tiny' ? 'text-xs' : 'text-sm'
              }`}>
                {item.author || item.director}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 ml-2 flex items-center gap-2">
            {item.type === 'book' ? (
              <Book className={`text-blue-400 ${cardSize === 'tiny' ? 'w-5 h-5' : cardSize === 'small' ? 'w-6 h-6' : 'w-7 h-7'}`} />
            ) : (
              <Film className={`text-purple-400 ${cardSize === 'tiny' ? 'w-5 h-5' : cardSize === 'small' ? 'w-6 h-6' : 'w-7 h-7'}`} />
            )}
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && cardSize !== 'tiny' && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-1 rounded-full ${cardSize === 'small' ? 'text-xs' : 'text-xs'}`}
                style={{ backgroundColor: hexToRgba(highlightColor, 0.12), color: 'white' }}
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-slate-500">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer pinned to bottom (absolute) */}
        <div className={`absolute left-0 right-0 bottom-0 px-3 py-3 flex items-center justify-between bg-transparent`}>
          <div className="flex items-center gap-2">
            {/* Rating */}
            {item.rating > 0 && cardSize !== 'tiny' && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => {
                  const fillState = getStarFill(i, item.rating);
                  const sizeClass = cardSize === 'tiny' ? 'w-2 h-2' : 'w-3 h-3';
                  
                  if (fillState === 'half') {
                    return (
                      <div key={i} className={`relative inline-block ${sizeClass}`}>
                        <Star className={`${sizeClass} text-slate-600 absolute top-0 left-0`} />
                        <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%', height: '100%' }}>
                          <Star className={`${sizeClass} text-yellow-400 fill-yellow-400`} />
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <Star
                      key={i}
                      className={`${sizeClass} ${
                        fillState === 'full' ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* Year / Date */}
            {item.year && (
              <div className={`text-slate-500 ${cardSize === 'tiny' ? 'text-xs' : 'text-sm'}`}>
                {item.year}
              </div>
            )}
          </div>

          {/* Status badge */}
          {item.status && (
            <div
              className={`flex items-center justify-center rounded-full ${getStatusColorClass(item.status)} bg-opacity-80 shadow-md ${
                cardSize === 'tiny' ? 'w-5 h-5' : cardSize === 'small' ? 'w-6 h-6' : 'w-7 h-7'
              }`}
              title={STATUS_LABELS[item.status]}
              style={{ backdropFilter: 'blur(4px)' }}
            >
              {getStatusIcon(item.status, `text-white ${cardSize === 'tiny' ? 'w-3 h-3' : cardSize === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ItemCard.displayName = 'ItemCard';

export default ItemCard;
