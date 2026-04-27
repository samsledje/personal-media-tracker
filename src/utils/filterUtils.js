import { RECENT_FILTER_OPTIONS, SORT_OPTIONS, SORT_ORDERS, STATUS_TYPES } from '../constants/index.js';

/**
 * Filter items based on search criteria
 * @param {object[]} items - Array of items to filter
 * @param {object} filters - Filter criteria
 * @returns {object[]} Filtered items
 */
export const filterItems = (items, filters) => {
  const {
    searchTerm = '',
    filterType = 'all',
    filterRating = 0,
    filterMaxRating = 0,
    filterHasReview = 'any',
    filterHasCover = 'any',
    filterTags = [],
    filterRecent = 'any',
    filterStatuses = [],
    filterStartDate = '',
    filterEndDate = ''
  } = filters;

  return items.filter(item => {
    const matchesSearch = !searchTerm ||
      (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.director && item.director.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.actors && item.actors.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (item.isbn && item.isbn.includes(searchTerm)) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesRating = (filterRating === 0 || (item.rating && item.rating >= filterRating)) &&
      (filterMaxRating === 0 || (item.rating && item.rating <= filterMaxRating));
    const matchesTags = filterTags.length === 0 ||
      (item.tags && filterTags.every(tag => item.tags.includes(tag)));

    const matchesStatus = filterStatuses.length === 0 ||
      (item.status && filterStatuses.includes(item.status));

    // Review filter: check if item has review content
    const hasReview = (item.review && item.review.trim() !== '') ||
      (item.body && item.body.trim() !== '');
    const matchesReview = (() => {
      // Handle new boolean object format
      if (typeof filterHasReview === 'object' && filterHasReview !== null) {
        return (filterHasReview.withReview && filterHasReview.withoutReview) || // both checked = any
          (filterHasReview.withReview && hasReview) ||
          (filterHasReview.withoutReview && !hasReview);
      }
      // Handle legacy string format for backward compatibility
      if (filterHasReview === 'any') return true;
      if (filterHasReview === 'with') return hasReview;
      if (filterHasReview === 'without') return !hasReview;
      return true; // default to any
    })();

    // Cover filter: check if item has cover URL
    const hasCover = item.coverUrl && item.coverUrl.trim() !== '';
    const matchesCover = (() => {
      // Handle new boolean object format
      if (typeof filterHasCover === 'object' && filterHasCover !== null) {
        return (filterHasCover.withCover && filterHasCover.withoutCover) || // both checked = any
          (filterHasCover.withCover && hasCover) ||
          (filterHasCover.withoutCover && !hasCover);
      }
      // Handle legacy string format for backward compatibility
      if (filterHasCover === 'any') return true;
      if (filterHasCover === 'with') return hasCover;
      if (filterHasCover === 'without') return !hasCover;
      return true; // default to any
    })();

    // Recent filter
    const consumedDateStr = item.dateRead || item.dateWatched || null;
    const matchesRecent = (() => {
      if (!filterRecent || filterRecent === RECENT_FILTER_OPTIONS.ANY) return true;
      if (!consumedDateStr) return false;
      const consumed = new Date(consumedDateStr);
      if (isNaN(consumed)) return false;
      const now = new Date();

      if (filterRecent === RECENT_FILTER_OPTIONS.LAST_7) {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return consumed >= cutoff;
      } else if (filterRecent === RECENT_FILTER_OPTIONS.LAST_30) {
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return consumed >= cutoff;
      } else if (filterRecent === RECENT_FILTER_OPTIONS.LAST_90) {
        const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return consumed >= cutoff;
      } else if (filterRecent === RECENT_FILTER_OPTIONS.LAST_6_MONTHS) {
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 6);
        return consumed >= cutoff;
      } else if (filterRecent === RECENT_FILTER_OPTIONS.LAST_YEAR) {
        const cutoff = new Date(now);
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        return consumed >= cutoff;
      } else if (filterRecent === RECENT_FILTER_OPTIONS.YEAR_TO_DATE) {
        const cutoff = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        return consumed >= cutoff;
      } else if (filterRecent === RECENT_FILTER_OPTIONS.CUSTOM_DATE_RANGE) {
        if (!filterStartDate && !filterEndDate) return true; // No custom range set
        const startDate = filterStartDate ? new Date(filterStartDate) : null;
        const endDate = filterEndDate ? new Date(filterEndDate) : null;
        if (startDate && !isNaN(startDate) && consumed < startDate) return false;
        if (endDate && !isNaN(endDate) && consumed > endDate) return false;
        return true;
      }

      return true;
    })();

    return matchesSearch && matchesType && matchesRating && matchesTags && matchesStatus && matchesReview && matchesCover && matchesRecent;
  });
};

/**
 * Sort items based on sort criteria
 * @param {object[]} items - Array of items to sort
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {object[]} Sorted items
 */
export const sortItems = (items, sortBy, sortOrder) => {
  return [...items].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case SORT_OPTIONS.TITLE:
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
        break;
      case SORT_OPTIONS.AUTHOR:
        aVal = (a.author || a.director || '').toLowerCase();
        bVal = (b.author || b.director || '').toLowerCase();
        break;
      case SORT_OPTIONS.YEAR:
        aVal = parseInt(a.year) || 0;
        bVal = parseInt(b.year) || 0;
        break;
      case SORT_OPTIONS.DATE_CONSUMED:
        aVal = new Date(a.dateRead || a.dateWatched || 0);
        bVal = new Date(b.dateRead || b.dateWatched || 0);
        break;
      case SORT_OPTIONS.STATUS:
        {
          // Define status ordering (same as getAllStatuses / desired display order)
          const ordered = [
            STATUS_TYPES.MOVIE.WATCHED,
            STATUS_TYPES.BOOK.READ,
            STATUS_TYPES.MOVIE.WATCHING,
            STATUS_TYPES.BOOK.READING,
            STATUS_TYPES.MOVIE.TO_WATCH,
            STATUS_TYPES.BOOK.TO_READ,
          ];
          const getRank = (it) => {
            const s = it && it.status ? it.status : '';
            const idx = ordered.indexOf(s);
            return idx === -1 ? ordered.length : idx;
          };
          aVal = getRank(a);
          bVal = getRank(b);
        }
        break;
      case SORT_OPTIONS.RATING:
        aVal = a.rating || 0;
        bVal = b.rating || 0;
        break;
      case SORT_OPTIONS.DATE_ADDED:
      default:
        aVal = new Date(a.dateAdded || 0);
        bVal = new Date(b.dateAdded || 0);
        break;
    }

    // Primary sort
    if (aVal < bVal) return sortOrder === SORT_ORDERS.ASC ? -1 : 1;
    if (aVal > bVal) return sortOrder === SORT_ORDERS.ASC ? 1 : -1;
    
    // Secondary sort: date consumed descending (most recent first)
    const aDateConsumed = new Date(a.dateRead || a.dateWatched || 0);
    const bDateConsumed = new Date(b.dateRead || b.dateWatched || 0);
    
    if (aDateConsumed > bDateConsumed) return -1;
    if (aDateConsumed < bDateConsumed) return 1;
    
    return 0;
  });
};

/**
 * Get all unique tags from items
 * @param {object[]} items - Array of items
 * @returns {string[]} Sorted array of unique tags
 */
export const getAllTags = (items) => {
  const tagSet = new Set();
  // More efficient: single loop, no intermediate arrays
  for (let i = 0; i < items.length; i++) {
    const tags = items[i].tags;
    if (tags && Array.isArray(tags)) {
      for (let j = 0; j < tags.length; j++) {
        tagSet.add(tags[j]);
      }
    }
  }
  // Convert to array and sort once
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

/**
 * Get all unique statuses from items in the desired order
 * @param {object[]} items - Array of items
 * @returns {string[]} Array of unique statuses
 */
export const getAllStatuses = (items) => {
  // Define the desired order: book statuses first, then movie statuses, with DNF at the end
  const orderedStatuses = [
    STATUS_TYPES.BOOK.TO_READ,
    STATUS_TYPES.BOOK.READING,
    STATUS_TYPES.BOOK.READ,
    STATUS_TYPES.MOVIE.TO_WATCH,
    STATUS_TYPES.MOVIE.WATCHING,
    STATUS_TYPES.MOVIE.WATCHED,
    STATUS_TYPES.BOOK.DNF
  ];

  // More efficient: use object for O(1) lookup instead of Set
  const foundStatuses = {};
  for (let i = 0; i < items.length; i++) {
    const status = items[i].status;
    if (status) {
      foundStatuses[status] = true;
    }
  }

  // Return only the statuses that actually exist in the items, in the desired order
  const result = [];
  for (let i = 0; i < orderedStatuses.length; i++) {
    if (foundStatuses[orderedStatuses[i]]) {
      result.push(orderedStatuses[i]);
    }
  }
  return result;
};
