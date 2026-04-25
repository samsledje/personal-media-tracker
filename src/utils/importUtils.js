import { parseCSV, detectCSVFormat, mapGoodreadsRow, mapLetterboxdRow, mapGenericRow } from './csvUtils.js';
import { isDuplicate, normalizeForCompare, normalizeISBNForCompare, sanitizeDisplayString } from './commonUtils.js';
import { getBookByISBN, OpenLibraryError } from '../services/openLibraryService.js';
import { getMovieByTitleYear, OMDBError } from '../services/omdbService.js';
import JSZip from 'jszip';

/**
 * Determine Letterboxd status from filename
 * watched.csv -> 'watched'
 * watchlist.csv -> 'to-watch'
 * default -> 'to-watch'
 */
const detectLetterboxdStatusFromFilename = (filename = '') => {
  if (!filename) return 'to-watch';
  const f = String(filename).toLowerCase();
  // Check 'watchlist' first to avoid matching 'watched' in filenames like 'watchlist.csv'
  if (f.endsWith('watchlist.csv') || f.includes('watchlist.csv')) return 'to-watch';
  if (f.endsWith('watched.csv') || f.includes('watched.csv')) return 'watched';
  return 'to-watch';
};

/**
 * Process a single Letterboxd mapped row and enrich via OMDb
 * @param {object} row - mapped Letterboxd row (from mapLetterboxdRow)
 * @param {string} filename - original filename
 * @param {string|null} omdbApiKey - optional API key (not used, service reads config)
 * @param {Function} onProgress - progress bridge callback (receives {processed,added,total})
 * @param {object} options - additional options including skipOmdb flag
 * @returns {Promise<object>} enriched mapped row suitable for saving
 */
const processLetterboxdRow = async (row, filename = '', omdbApiKey = null, onProgress = null, options = {}) => {
  const title = row.title || row.Name || '';
  const year = row.year || '';

  // Determine status from filename if the row doesn't already have one
  // If the filename explicitly contains watchlist/watched, prefer that mapping
  const filenameStatus = detectLetterboxdStatusFromFilename(filename);
  if (filenameStatus) {
    row.status = filenameStatus;
  } else if (!row.status || String(row.status).trim() === '') {
    row.status = 'to-watch';
  }

  // Normalize dates: dateAdded is provided by mapLetterboxdRow as dateAdded already
  // dateConsumed/dateWatched should be set when status is 'watched'
  if (row.status === 'watched' && !row.dateWatched) {
    row.dateWatched = row.dateWatched || row.dateAdded || '';
  }

  // Call progress bridge before OMDb fetch to keep UI responsive
  if (typeof onProgress === 'function') {
    try { onProgress(); } catch (e) { /* swallow */ }
  }

  // Skip OMDB enrichment if requested (e.g., after quota exceeded)
  if (!options.skipOmdb) {
    try {
      const omdb = await getMovieByTitleYear(title, year);
      if (omdb) {
        row.director = row.director || omdb.director || '';
        row.actors = row.actors && row.actors.length ? row.actors : (omdb.actors || []);
        row.coverUrl = row.coverUrl || omdb.coverUrl || '';
        row.plot = row.plot || omdb.plot || '';
        row.year = row.year || omdb.year || '';
      }
    } catch (err) {
      // If this is an OMDB API error (quota/auth), rethrow it so import can pause
      if (err instanceof OMDBError && (err.type === 'QUOTA_EXCEEDED' || err.type === 'AUTH_FAILED' || err.type === 'INVALID_KEY')) {
        throw err;
      }
      // For other errors, gracefully fallback: keep spreadsheet values only
      console.warn('[Import][Letterboxd] OMDb lookup failed for', title, year, err);
    }
  }

  // Call progress bridge after OMDb fetch
  if (typeof onProgress === 'function') {
    try { onProgress(); } catch (e) { /* swallow */ }
  }

  // Ensure type
  row.type = 'movie';
  return row;
};

/**
 * Find an existing movie that matches the mapped row.
 * Matching order: title+director, title+year, title only.
 * Returns the existing item or null.
 */
const findMatchingMovie = (existingItems = [], mappedRow = {}) => {
  if (!existingItems || existingItems.length === 0) return null;
  const nTitle = normalizeForCompare(mappedRow.title || '');
  const nDirector = normalizeForCompare(mappedRow.director || '');
  const year = (mappedRow.year || '').toString().trim();

  // Try title+director (but only if both have director info)
  if (nDirector) {
    let found = existingItems.find(it => it.type === 'movie' && normalizeForCompare(it.title || '') === nTitle && normalizeForCompare(it.director || '') === nDirector);
    if (found) return found;
  }

  // Try title+year
  if (year) {
    let found = existingItems.find(it => it.type === 'movie' && normalizeForCompare(it.title || '') === nTitle && String(it.year || '').trim() === year);
    if (found) return found;
  }

  // Fallback: title only (this is important for films.csv which may not have director info)
  let found = existingItems.find(it => it.type === 'movie' && normalizeForCompare(it.title || '') === nTitle);
  return found || null;
};

/**
 * Normalize rating values to nearest half star (0, 0.5, 1, 1.5, ..., 5)
 * Accepts numbers or numeric strings like '3.5' and returns a number rounded to nearest 0.5.
 */
const normalizeRating = (r) => {
  if (r === null || r === undefined || r === '') return 0;
  const n = Number(r);
  if (Number.isNaN(n)) {
    return 0;
  }
  // Round to nearest half star: multiply by 2, round, divide by 2
  return Math.round(n * 2) / 2;
};

/**
 * Extract CSV files from a Letterboxd zip export
 * @param {File} zipFile - The zip file to extract
 * @returns {Promise<{name: string, content: string}[]>} Array of CSV files with their content
 */
const extractLetterboxdZip = async (zipFile) => {
  const zip = new JSZip();
  const zipContent = await zipFile.arrayBuffer();
  await zip.loadAsync(zipContent);

  const csvFiles = [];
  
  // Expected files in Letterboxd export:
  // - watched.csv (root)
  // - watchlist.csv (root) 
  // - ratings.csv (root)
  // - reviews.csv (root)
  // - likes/films.csv (in subdirectory)
  
  const expectedFiles = [
    'watched.csv',
    'watchlist.csv', 
    'ratings.csv',
    'reviews.csv',
    'likes/films.csv'
  ];

  for (const expectedFile of expectedFiles) {
    const file = zip.file(expectedFile);
    if (file) {
      const content = await file.async('text');
      // Normalize the filename - treat films.csv as films.csv regardless of path
      const normalizedName = expectedFile.includes('films.csv') ? 'films.csv' : expectedFile;
      csvFiles.push({
        name: normalizedName,
        content: content
      });
    }
  }

  return csvFiles;
};

/**
 * Create a File-like object from CSV content
 * @param {string} content - CSV content
 * @param {string} filename - Original filename
 * @returns {File} File object that can be passed to processCSVImport
 */
const createFileFromContent = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
};

/**
 * Process a Letterboxd zip export containing multiple CSV files
 * @param {File} zipFile - The zip file to process
 * @param {object[]} existingItems - Existing items for duplicate detection
 * @param {Function} saveItem - Function to save individual items
 * @param {Function} [onProgress] - Optional callback(progress) called with { processed, added, total, currentFile }
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the import
 * @param {Function} [onAPIError] - Optional callback for API errors (OMDB/OpenLibrary)
 * @returns {Promise<{added:number, format:string, filesProcessed:string[]}>} Results summary
 */
export const processZipImport = async (zipFile, existingItems, saveItem, onProgress, signal = null, onAPIError = null) => {
  if (!zipFile) return { added: 0, format: 'unknown', filesProcessed: [] };

  // Check if import was aborted before starting
  if (signal && signal.aborted) {
    throw new DOMException('Import was cancelled', 'AbortError');
  }

  console.log('Processing Letterboxd zip file:', zipFile.name);
  
  try {
    // Extract CSV files from zip
    const csvFiles = await extractLetterboxdZip(zipFile);
    console.log('Extracted CSV files:', csvFiles.map(f => f.name));
    
    if (csvFiles.length === 0) {
      throw new Error('No supported CSV files found in zip archive');
    }

    let totalAdded = 0;
    const filesProcessed = [];
    let totalFiles = csvFiles.length;
    let filesCompleted = 0;

    // Keep track of all items (existing + newly imported) for duplicate detection
    // We'll update this after each file is processed
    let currentItems = [...existingItems];

    // Process files in a specific order to handle dependencies correctly:
    // 1. watched.csv and watchlist.csv first (create base movie entries)
    // 2. ratings.csv and reviews.csv (update existing entries)  
    // 3. films.csv last (add liked tag to existing entries)
    const processingOrder = ['watched.csv', 'watchlist.csv', 'ratings.csv', 'reviews.csv', 'films.csv'];
    
    for (const expectedFile of processingOrder) {
      // Check if import was aborted
      if (signal && signal.aborted) {
        console.log('[Import][Zip] Aborted during file processing');
        throw new DOMException('Import was cancelled', 'AbortError');
      }

      const csvFile = csvFiles.find(f => f.name === expectedFile);
      if (!csvFile) continue;

      console.log(`Processing ${csvFile.name}...`);
      
      // Create File object from CSV content
      const file = createFileFromContent(csvFile.content, csvFile.name);
      
      // Track items added in this file so we can update currentItems
      const itemsAddedInThisFile = [];
      
      // Wrap saveItem to track what gets added
      const trackingSaveItem = async (item) => {
        // Save the item (delegate to provided saveItem). We call the original saveItem
        // which may be a storage adapter; await its completion so any mutations take
        // effect before we capture the saved item.
        await saveItem(item);

        // Build a stable key for the item to detect uniqueness across saves.
        const titleKey = normalizeForCompare(item.title || '');
        const secondKey = item.type === 'movie' ? normalizeForCompare(item.director || '') : normalizeForCompare(item.author || '');
        const itemKey = `${titleKey}|${secondKey}`;

        // Helper to compute key for an existing entry
        const computeKey = (it) => `${normalizeForCompare(it.title||'')}|${it.type === 'movie' ? normalizeForCompare(it.director||'') : normalizeForCompare(it.author||'')}`;

        // If this item already exists in itemsAddedInThisFile, update that entry so
        // later files see the most recent version.
        const existingIndex = itemsAddedInThisFile.findIndex(it => computeKey(it) === itemKey);
        if (existingIndex !== -1) {
          itemsAddedInThisFile[existingIndex] = { ...itemsAddedInThisFile[existingIndex], ...item };
        } else {
          // If it's not present in itemsAddedInThisFile, check if it already existed
          // in currentItems (items present before this file started). If it did not,
          // treat it as newly added and push a copy. If it did exist, update the
          // entry in currentItems so subsequent files can find the updated values.
          const curIndex = currentItems.findIndex(it => computeKey(it) === itemKey);
          if (curIndex === -1) {
            itemsAddedInThisFile.push({ ...item });
          } else {
            // Merge latest fields into the existing currentItems entry
            currentItems[curIndex] = { ...currentItems[curIndex], ...item };
          }
        }
      };
      
      // Create progress wrapper that includes current file info
      const fileProgressWrapper = (progress) => {
        if (typeof onProgress === 'function') {
          onProgress({
            ...progress,
            currentFile: csvFile.name,
            filesCompleted,
            totalFiles
          });
        }
      };

      try {
  const result = await processCSVImport(file, currentItems, trackingSaveItem, fileProgressWrapper, currentItems, signal, onAPIError);
        totalAdded += result.added;
        filesProcessed.push(csvFile.name);
        
        // Update currentItems with newly added items for the next file's duplicate detection
        currentItems = [...currentItems, ...itemsAddedInThisFile];
        
        console.log(`Completed ${csvFile.name}: ${result.added} items added`);
      } catch (error) {
        console.error(`Error processing ${csvFile.name}:`, error);
        // Continue with other files even if one fails
      }
      
      filesCompleted++;
    }

    return {
      added: totalAdded,
      format: 'letterboxd-zip',
      filesProcessed
    };
    
  } catch (error) {
    console.error('Error processing Letterboxd zip:', error);
    throw new Error(`Error processing zip file: ${error.message}`);
  }
};

/**
 * Process CSV import file
 * @param {File} file - CSV file to import
 * @param {object[]} existingItems - Existing items for duplicate detection
 * @param {Function} saveItem - Function to save individual items
 * @param {Function} [onProgress] - Optional callback(progress) called with { processed, added, total }
 * @param {object} [zipCurrentItems] - Optional current items for zip imports
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the import
 * @param {Function} [onAPIError] - Optional callback for API errors (OMDB/OpenLibrary), returns { continue: bool, skipEnrichment: bool }
 * @returns {Promise<{added:number, format:string}>} Number of items imported and detected format
 */
export const processCSVImport = async (file, existingItems, saveItem, onProgress, zipCurrentItems = null, signal = null, onAPIError = null) => {
  if (!file) return { added: 0, format: undefined };

  // Check if import was aborted before starting
  if (signal && signal.aborted) {
    throw new DOMException('Import was cancelled', 'AbortError');
  }

  // When called from a zip import, zipCurrentItems will be passed and contains
  // the up-to-date list of items (existing + those added earlier in the zip).
  const itemsForMatching = Array.isArray(zipCurrentItems) ? zipCurrentItems : existingItems;

  console.log("Processing CSV file:");
  try {
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    console.log("Parsed CSV with headers:", headers);
    const format = detectCSVFormat(headers);
    console.log("Detected CSV format:", format);
    let mapped = [];
    if (format === 'goodreads') {
      mapped = rows.map(mapGoodreadsRow);
    } else if (format === 'letterboxd') {
      mapped = rows.map(mapLetterboxdRow);
    } else {
      mapped = rows.map(mapGenericRow);
    }

    let added = 0;
    const total = mapped.length;
    let processed = 0;
    let skipEnrichment = false; // Flag to skip API enrichment (OMDB/OpenLibrary) after user chooses to continue without it

    // Build a dedupe set from existingItems so we can detect duplicates quickly
    // For books use title|author, for movies use title|director
    const dedupeSet = new Set((itemsForMatching || []).map(it => {
      const t = normalizeForCompare(it.title||'');
      const second = it.type === 'movie' ? normalizeForCompare(it.director||'') : normalizeForCompare(it.author||'');
      const i = normalizeISBNForCompare(it.isbn||'');
      // Add both title|second and isbn keys (if present)
      const keys = [`${t}|${second}`];
      if (i) keys.push(`isbn:${i}`);
      // For movies, also add title-only key for flexible matching
      if (it.type === 'movie') {
        keys.push(`${t}|`);
      }
      return keys;
    }).flat());

    // Report initial progress
    if (typeof onProgress === 'function') onProgress({ processed, added, total });

    // console log length of mapped
    console.log("Mapped rows count:", mapped.length);
    
    // Queue for items ready to be saved (enriched and deduplicated)
    const saveQueue = [];
    const SAVE_BATCH_SIZE = 10; // Save 10 items concurrently
    
    // Helper to flush the save queue
    const flushSaveQueue = async () => {
      if (saveQueue.length === 0) return;
      
      const itemsToSave = [...saveQueue];
      saveQueue.length = 0; // Clear the queue
      
      console.log(`[Import] Flushing save queue with ${itemsToSave.length} items`);
      
      // Save all items in parallel
      const savePromises = itemsToSave.map(async ({ item, dedupeKeys }) => {
        try {
          await saveItem(item);
          // Add to dedupe set after successful save
          dedupeKeys.forEach(key => dedupeSet.add(key));
          return { success: true, item };
        } catch (err) {
          console.error('Error saving imported item', item, err);
          return { success: false, item, error: err };
        }
      });
      
      const results = await Promise.allSettled(savePromises);
      
      // Count successful saves
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          added++;
        }
      });
      
      // Report progress after batch
      if (typeof onProgress === 'function') {
        onProgress({ processed, added, total });
      }
    };
    
    for (const rawRow of mapped) {
      // Check if import was aborted
      if (signal && signal.aborted) {
        console.log('[Import] Aborted during processing');
        // Flush any pending saves before aborting
        await flushSaveQueue();
        throw new DOMException('Import was cancelled', 'AbortError');
      }

      // For Letterboxd, enrich row first so we can dedupe by director
      let m = rawRow;
      if (format === 'letterboxd') {
        // Create a progress bridge that injects current counters when invoked
        const progressBridge = (...args) => {
          if (typeof onProgress === 'function') {
            try { onProgress({ processed, added, total }); } catch (e) { /* swallow */ }
          }
        };
        try {
          m = await processLetterboxdRow(rawRow, file.name, null, progressBridge, { skipOmdb: skipEnrichment });
        } catch (e) {
          // Handle OMDB errors specially
          if (e instanceof OMDBError && (e.type === 'QUOTA_EXCEEDED' || e.type === 'AUTH_FAILED' || e.type === 'INVALID_KEY')) {
            console.warn('[Import] OMDB API error:', e.message);
            
            // Ask user what to do via callback
            if (typeof onAPIError === 'function') {
              const decision = await onAPIError(e);
              if (!decision || !decision.continue) {
                // User chose to stop import
                throw new DOMException('Import cancelled due to API error', 'AbortError');
              }
              if (decision.skipEnrichment) {
                // User chose to continue without API enrichment
                skipEnrichment = true;
              }
            } else {
              // No callback provided, skip enrichment for remaining items
              skipEnrichment = true;
            }
            
            // Process the row again without OMDB
            m = await processLetterboxdRow(rawRow, file.name, null, progressBridge, { skipOmdb: true });
          } else {
            console.warn('[Import] Failed to process Letterboxd row:', e);
            m = rawRow; // fallback to raw mapping
          }
        }
      }

      // If this is a Letterboxd ratings/reviews export, we expect the movies to already exist
      // and should update fields rather than be blocked by dedupe checks. Handle those first.
      const lowerName = (file.name || '').toLowerCase();
  const isRatingsFile = format === 'letterboxd' && (lowerName.includes('ratings.csv') || lowerName === 'ratings.csv' || lowerName.includes('ratings'));
  const isReviewsFile = format === 'letterboxd' && (lowerName.includes('reviews.csv') || lowerName === 'reviews.csv' || lowerName.includes('reviews'));
  // films.csv is a Letterboxd export of liked films — treat like ratings/reviews in matching/dedup
  const isFilmsFile = format === 'letterboxd' && (lowerName.includes('films.csv') || lowerName === 'films.csv' || lowerName.includes('films'));
      if (isRatingsFile || isReviewsFile || isFilmsFile) {
        const existing = findMatchingMovie(itemsForMatching, m);
        if (existing) {
          if (isRatingsFile) {
            // prefer m.rating, fallback to m.Rating, then existing
            const raw = (m.rating !== undefined && m.rating !== null && String(m.rating).trim() !== '') ? m.rating : ((m.Rating !== undefined && m.Rating !== null && String(m.Rating).trim() !== '') ? m.Rating : (existing.rating || 0));
            existing.rating = normalizeRating(raw);
          }
          if (isReviewsFile) {
            existing.review = (m.review !== undefined && m.review !== null && String(m.review).trim() !== '') ? m.review : existing.review || '';
            // If reviews.csv also contains a rating column, overwrite existing rating (rounded)
            const hasRating = (m.rating !== undefined && m.rating !== null && String(m.rating).trim() !== '') || (m.Rating !== undefined && m.Rating !== null && String(m.Rating).trim() !== '');
            if (hasRating) {
              const raw = (m.rating !== undefined && m.rating !== null && String(m.rating).trim() !== '') ? m.rating : m.Rating;
              existing.rating = normalizeRating(raw);
            }
            // merge tags if present on reviews.csv
            const incomingTags = Array.isArray(m.tags) ? m.tags : (m.tags ? String(m.tags).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
            if (incomingTags.length) {
              existing.tags = Array.isArray(existing.tags) ? existing.tags : (existing.tags ? String(existing.tags).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
              const merged = new Set([...(existing.tags || []), ...incomingTags]);
              existing.tags = Array.from(merged);
            }
          }
          // If this is a films.csv import (liked films), add the 'liked' tag
          if (isFilmsFile) {
            existing.tags = Array.isArray(existing.tags) ? existing.tags : (existing.tags ? String(existing.tags).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
            existing.tags = Array.from(new Set([...(existing.tags || []), 'liked']));
          }
          // Ensure the filename is preserved to avoid creating duplicates
          if (!existing.filename && itemsForMatching) {
            const originalItem = itemsForMatching.find(orig => 
              orig.title === existing.title && 
              orig.type === existing.type && 
              orig.director === existing.director
            );
            if (originalItem && originalItem.filename) {
              existing.filename = originalItem.filename;
            }
          }
          
          // Prepare dedupe keys
          const t = normalizeForCompare(existing.title||'');
          const second = existing.type === 'movie' ? normalizeForCompare(existing.director||'') : normalizeForCompare(existing.author||'');
          const i = normalizeISBNForCompare(existing.isbn||'');
          const dedupeKeys = [`${t}|${second}`];
          if (i) dedupeKeys.push(`isbn:${i}`);
          if (existing.type === 'movie') {
            dedupeKeys.push(`${t}|`);
          }
          
          // Add to save queue instead of saving immediately
          saveQueue.push({ item: existing, dedupeKeys });
          
          // Flush queue if it reaches batch size
          if (saveQueue.length >= SAVE_BATCH_SIZE) {
            await flushSaveQueue();
          }
          // mark as processed (not added)
          processed++;
          if (typeof onProgress === 'function') onProgress({ processed, added, total });
          // skip the normal add flow for this row
          continue;
        }
        // if no existing item found, fall through to normal import behavior (create new)
        // EXCEPTION: For films.csv, we should NEVER create new movies - only update existing ones
        if (isFilmsFile) {
          processed++;
          if (typeof onProgress === 'function') onProgress({ processed, added, total });
          continue; // Skip this entry entirely
        }
      }

      // Basic de-dup: skip if same title+author (books) or title+director (movies) exists
      const t = normalizeForCompare(m.title||'');
      const second = m.type === 'movie' ? normalizeForCompare(m.director||'') : normalizeForCompare(m.author||'');
      const i = normalizeISBNForCompare(m.isbn||'');
      const key = `${t}|${second}`;
      const isbnKey = i ? `isbn:${i}` : null;
      
      // For movies, also check for title-only matches (important for films.csv which may lack director info)
      const titleOnlyKey = m.type === 'movie' ? `${t}|` : null;
      
  if ((isbnKey && dedupeSet.has(isbnKey)) || dedupeSet.has(key) || (titleOnlyKey && dedupeSet.has(titleOnlyKey)) || isDuplicate(itemsForMatching, m)) {
        // mark as processed even if skipped
        processed++;
        if (typeof onProgress === 'function') onProgress({ processed, added, total });
        continue;
      }

      try {
        // If this is a Goodreads import and an ISBN exists, try to enrich missing fields
        let olData = null;
        if (format === 'goodreads' && m.isbn && !skipEnrichment) {
          try {
            olData = await getBookByISBN(m.isbn);
          } catch (err) {
            // Handle Open Library API errors specially
            if (err instanceof OpenLibraryError && (err.type === 'NETWORK' || err.type === 'SERVICE_DOWN')) {
              console.warn('[Import] Open Library API error:', err.message);
              
              // Ask user what to do via callback
              if (typeof onAPIError === 'function') {
                const decision = await onAPIError(err);
                if (!decision || !decision.continue) {
                  // User chose to stop import
                  throw new DOMException('Import cancelled due to Open Library error', 'AbortError');
                }
                if (decision.skipEnrichment) {
                  // User chose to continue without Open Library enrichment
                  skipEnrichment = true;
                }
              } else {
                // No callback provided, skip enrichment for remaining items
                skipEnrichment = true;
              }
            } else {
              // For other errors (book not found, etc), just proceed with spreadsheet data
              console.warn('[Open Library] lookup failed for ISBN', m.isbn, err);
            }
            olData = null;
          }
        }

  // Merge fields: prefer spreadsheet values; only fill when spreadsheet is empty
  const mergedTitle = sanitizeDisplayString(m.title && m.title.trim() ? m.title : (olData?.title || 'Untitled'));
  const mergedAuthor = sanitizeDisplayString(m.author && m.author.trim() ? m.author : (olData?.author || ''));
        const mergedYear = m.year && String(m.year).trim() ? m.year : (olData?.year || '');
        const mergedCover = m.coverUrl && m.coverUrl.trim() ? m.coverUrl : (olData?.coverUrl || '');

        const baseItem = {
          title: mergedTitle,
          type: m.type || 'book',
          author: mergedAuthor,
          director: m.director || '',
          isbn: m.isbn || (olData?.isbn || ''),
          year: mergedYear,
          rating: normalizeRating(m.rating || m.Rating || 0),
          tags: m.tags || [],
          status: m.status || 'unread',
          coverUrl: mergedCover,
          dateRead: m.dateRead || '',
          dateWatched: m.dateWatched || '',
          dateAdded: m.dateAdded || new Date().toISOString(),
          review: m.review || ''
        };

        // Special-case: if user imported Letterboxd ratings.csv or reviews.csv,
        // update existing movies rather than create new items.
        const lowerName = (file.name || '').toLowerCase();
  if (format === 'letterboxd' && (lowerName.includes('ratings.csv') || lowerName === 'ratings.csv')) {
          // rating update
          const existing = findMatchingMovie(itemsForMatching, m);
          if (existing) {
            {
              const raw = baseItem.rating || existing.rating || 0;
              existing.rating = normalizeRating(raw);
            }
            // Ensure the filename is preserved to avoid creating duplicates
            if (!existing.filename && itemsForMatching) {
              const originalItem = itemsForMatching.find(orig => 
                orig.title === existing.title && 
                orig.type === existing.type && 
                orig.director === existing.director
              );
              if (originalItem && originalItem.filename) {
                existing.filename = originalItem.filename;
              }
            }
            
            // Prepare dedupe keys
            const t = normalizeForCompare(existing.title||'');
            const second = existing.type === 'movie' ? normalizeForCompare(existing.director||'') : normalizeForCompare(existing.author||'');
            const i = normalizeISBNForCompare(existing.isbn||'');
            const dedupeKeys = [`${t}|${second}`];
            if (i) dedupeKeys.push(`isbn:${i}`);
            if (existing.type === 'movie') {
              dedupeKeys.push(`${t}|`);
            }
            
            // Add to save queue instead of saving immediately
            saveQueue.push({ item: existing, dedupeKeys });
            
            // Flush queue if it reaches batch size
            if (saveQueue.length >= SAVE_BATCH_SIZE) {
              await flushSaveQueue();
            }
            // count as processed but not added
            processed++;
            if (typeof onProgress === 'function') onProgress({ processed, added, total });
            continue;
          }
        }

    if (format === 'letterboxd' && (lowerName.includes('reviews.csv') || lowerName === 'reviews.csv')) {
          // review update
          const existing = findMatchingMovie(itemsForMatching, m);
          if (existing) {
            existing.review = baseItem.review || existing.review || '';
            if (baseItem.rating) {
              existing.rating = normalizeRating(baseItem.rating);
            }
            // Merge tags from the review CSV if present (avoid duplicates)
            const incomingTags = Array.isArray(m.tags) ? m.tags : (m.tags ? String(m.tags).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
            if (incomingTags.length) {
              existing.tags = Array.isArray(existing.tags) ? existing.tags : (existing.tags ? String(existing.tags).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
              const merged = new Set([...(existing.tags || []), ...incomingTags]);
              existing.tags = Array.from(merged);
            }
            // Ensure the filename is preserved to avoid creating duplicates
            if (!existing.filename && itemsForMatching) {
              const originalItem = itemsForMatching.find(orig => 
                orig.title === existing.title && 
                orig.type === existing.type && 
                orig.director === existing.director
              );
              if (originalItem && originalItem.filename) {
                existing.filename = originalItem.filename;
              }
            }
            
            // Prepare dedupe keys
            const t = normalizeForCompare(existing.title||'');
            const second = existing.type === 'movie' ? normalizeForCompare(existing.director||'') : normalizeForCompare(existing.author||'');
            const i = normalizeISBNForCompare(existing.isbn||'');
            const dedupeKeys = [`${t}|${second}`];
            if (i) dedupeKeys.push(`isbn:${i}`);
            if (existing.type === 'movie') {
              dedupeKeys.push(`${t}|`);
            }
            
            // Add to save queue instead of saving immediately
            saveQueue.push({ item: existing, dedupeKeys });
            
            // Flush queue if it reaches batch size
            if (saveQueue.length >= SAVE_BATCH_SIZE) {
              await flushSaveQueue();
            }
            // count as processed but not added
            processed++;
            if (typeof onProgress === 'function') onProgress({ processed, added, total });
            continue;
          }
        }

        // Only include actors if the source provides them or if it's a movie
        if (m.type && m.type.toLowerCase() === 'movie') {
          baseItem.actors = m.actors || [];
        } else if (m.actors && Array.isArray(m.actors) && m.actors.length > 0) {
          baseItem.actors = m.actors;
        }

        const itemToSave = baseItem;

        // Prepare dedupe keys
        const dedupeKeys = [key];
        if (i) dedupeKeys.push(`isbn:${i}`);
        if (m.type === 'movie') {
          dedupeKeys.push(`${t}|`);
        }
        
        // Add to save queue instead of saving immediately
        saveQueue.push({ item: itemToSave, dedupeKeys });
        
        // Flush queue if it reaches batch size
        if (saveQueue.length >= SAVE_BATCH_SIZE) {
          await flushSaveQueue();
        }
      } catch (err) {
        // Re-throw AbortError to stop the import
        if (err.name === 'AbortError') {
          throw err;
        }
        console.error('Error processing imported item', m, err);
      }
      // increment processed count and report progress
      processed++;
      if (typeof onProgress === 'function') {
        try {
          onProgress({ processed, added, total });
        } catch (e) {
          // swallow progress callback errors
          console.warn('onProgress callback threw', e);
        }
      }
    }
    
    // Flush any remaining items in the save queue
    await flushSaveQueue();

    return { added, format };
  } catch (err) {
    console.error('Error importing CSV', err);
    // Provide more specific error message
    const errorMsg = err.message || 'Unknown error';
    throw new Error(`Error importing CSV: ${errorMsg}`);
  }
};

/**
 * Process import file (CSV or ZIP)
 * @param {File} file - File to import (CSV or ZIP)
 * @param {object[]} existingItems - Existing items for duplicate detection
 * @param {Function} saveItem - Function to save individual items
 * @param {Function} [onProgress] - Optional callback(progress) called with { processed, added, total }
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the import
 * @param {Function} [onAPIError] - Optional callback for API errors (OMDB/OpenLibrary)
 * @returns {Promise<{added:number, format:string, filesProcessed?:string[]}>} Import results
 */
export const processImportFile = async (file, existingItems, saveItem, onProgress, signal = null, onAPIError = null) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check if import was aborted before starting
  if (signal && signal.aborted) {
    throw new DOMException('Import was cancelled', 'AbortError');
  }

  const fileName = file.name.toLowerCase();
  const isZip = fileName.endsWith('.zip');
  const isCsv = fileName.endsWith('.csv');

  if (isZip) {
    console.log('Detected zip file, processing as Letterboxd export');
    return await processZipImport(file, existingItems, saveItem, onProgress, signal, onAPIError);
  } else if (isCsv) {
    console.log('Detected CSV file, processing as single CSV');
    const result = await processCSVImport(file, existingItems, saveItem, onProgress, null, signal, onAPIError);
    return {
      ...result,
      filesProcessed: [file.name]
    };
  } else {
    throw new Error('Unsupported file type. Please upload a CSV or ZIP file.');
  }
};