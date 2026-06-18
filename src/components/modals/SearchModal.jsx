import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Book, Film } from 'lucide-react';
import { searchBooks, OpenLibraryError } from '../../services/openLibraryService.js';
import { searchMovies, isServiceAvailable, OMDBError } from '../../services/omdbService.js';
import { searchMovies as searchMoviesTMDB, isServiceAvailable as isTmdbAvailable, TMDBError } from '../../services/tmdbService.js';
import { KEYBOARD_SHORTCUTS } from '../../constants/index.js';
import { toast } from '../../services/toastService.js';

/**
 * Modal for searching books and movies online
 */
const SearchModal = ({ onClose, onSelect }) => {
  const [searchType, setSearchType] = useState('book');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef(null);

  const handleSearchBooks = async (searchQuery) => {
    setLoading(true);
    setFocusedIndex(-1); // Reset focus when searching
    try {
      const books = await searchBooks(searchQuery);
      setResults(books);
    } catch (error) {
      console.error('Error searching books:', error);

      // Handle different Open Library error types
      if (error instanceof OpenLibraryError) {
        switch (error.type) {
          case 'SERVICE_DOWN':
            toast('Open Library service is temporarily unavailable. Please try again later.', { type: 'error' });
            break;
          case 'NETWORK':
            toast('Unable to connect to Open Library. Please check your internet connection.', { type: 'error' });
            break;
          default:
            toast(error.message, { type: 'error' });
        }
      } else {
        toast(error.message || 'Failed to search books', { type: 'error' });
      }
    }
    setLoading(false);
  };

  const handleSearchMoviesOmdb = async (searchQuery) => {
    if (!isServiceAvailable()) {
      setShowApiKeyWarning(true);
      setLoading(false);
      return;
    }
    try {
      const movies = await searchMovies(searchQuery);
      setResults(movies);
      setShowApiKeyWarning(false);
    } catch (error) {
      console.error('Error searching movies:', error);
      if (error instanceof OMDBError) {
        switch (error.type) {
          case 'AUTH_FAILED':
          case 'INVALID_KEY':
            setShowApiKeyWarning(true);
            toast('OMDb API key is invalid or has expired. Please check your API key in settings.', { type: 'error' });
            break;
          case 'QUOTA_EXCEEDED':
            toast('OMDb API daily limit reached. Try again tomorrow or upgrade your API key.', { type: 'error' });
            break;
          case 'RATE_LIMIT':
            toast('OMDb API rate limit exceeded. Please wait a moment and try again.', { type: 'error' });
            break;
          default:
            toast(error.message, { type: 'error' });
        }
      } else if (error.message === 'API_KEY_MISSING') {
        setShowApiKeyWarning(true);
        toast('Please configure your OMDb API key first.', { type: 'error' });
      } else {
        toast(error.message || 'Failed to search movies', { type: 'error' });
      }
    }
  };

  const handleSearchMovies = async (searchQuery) => {
    setLoading(true);
    setFocusedIndex(-1);

    if (isTmdbAvailable()) {
      try {
        const movies = await searchMoviesTMDB(searchQuery);
        setResults(movies);
        setShowApiKeyWarning(false);
        setLoading(false);
        return;
      } catch (error) {
        if (error instanceof TMDBError && error.type === 'AUTH_FAILED') {
          toast('TMDB API key is invalid. Falling back to OMDb search.', { type: 'warning' });
          // fall through to OMDb
        } else {
          toast(error.message || 'Failed to search movies', { type: 'error' });
          setLoading(false);
          return;
        }
      }
    }

    await handleSearchMoviesOmdb(searchQuery);
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);
    if (searchType === 'book') {
      handleSearchBooks(query);
    } else {
      handleSearchMovies(query);
    }
  }; useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (query.trim()) handleSearch({ preventDefault: () => { } });
      }

      // Focus search input with / key or Ctrl/Cmd+K (like main app)
      if ((e.key === '/' && !e.ctrlKey && !e.metaKey) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        if (document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            setFocusedIndex(-1); // Reset result focus when focusing search
          }
        }
      }

      // Handle arrow navigation in search input
      if (e.target === searchInputRef.current) {
        if (e.key === 'ArrowDown' && results.length > 0) {
          e.preventDefault();
          searchInputRef.current.blur();
          setFocusedIndex(0);
          return;
        }
        // Don't handle other shortcuts while typing in search input
        return;
      }

      // Result navigation
      if (results.length > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();

        let newIndex = focusedIndex;
        const cols = 4; // Based on xl:grid-cols-4

        if (e.key === 'ArrowLeft') {
          newIndex = Math.max(0, focusedIndex - 1);
        } else if (e.key === 'ArrowRight') {
          newIndex = Math.min(results.length - 1, focusedIndex + 1);
        } else if (e.key === 'ArrowUp') {
          if (focusedIndex < cols) {
            // If in first row, focus search input
            if (searchInputRef.current) {
              searchInputRef.current.focus();
              setFocusedIndex(-1);
            }
            return;
          }
          newIndex = Math.max(0, focusedIndex - cols);
        } else if (e.key === 'ArrowDown') {
          newIndex = Math.min(results.length - 1, focusedIndex + cols);
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (focusedIndex >= 0 && focusedIndex < results.length) {
            handleSelect(results[focusedIndex]);
          }
          return;
        }

        setFocusedIndex(newIndex);
        return;
      }

      // Don't handle shortcuts while typing in other inputs
      if (e.target.tagName === 'INPUT') return;

      // Switch to books: B
      if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.FILTER_BOOKS) {
        e.preventDefault();
        setSearchType('book');
        setFocusedIndex(-1); // Reset focus when switching type
        return;
      }

      // Switch to movies: M
      if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.FILTER_MOVIES) {
        e.preventDefault();
        setSearchType('movie');
        setFocusedIndex(-1); // Reset focus when switching type
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [query, searchType, results, focusedIndex]);

  // Reset hasSearched when query changes
  useEffect(() => {
    setHasSearched(false);
  }, [query]);

  const handleSelect = (result) => {
    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    };

    // Only set the appropriate date field based on the item type
    const dateFields = result.type === 'movie'
      ? { dateWatched: getTodayDate() }
      : { dateRead: getTodayDate() };

    onSelect({
      ...result,
      rating: 0,
      tags: [],
      ...dateFields,
      dateAdded: new Date().toISOString(),
      review: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className="bg-slate-800 border border-slate-700 rounded-lg w-full h-full sm:max-w-4xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 id="search-modal-title" className="text-lg sm:text-xl font-bold">Search Books & Movies</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {searchType === 'movie' && showApiKeyWarning && (
            <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
              <p className="text-sm text-yellow-200 leading-mobile">
                ⚠️ OMDb API key required for movie searches. Please configure your API key in the main interface first.
              </p>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            {['book', 'movie'].map(type => (
              <button
                key={type}
                onClick={() => setSearchType(type)}
                className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-lg transition capitalize flex items-center justify-center gap-2 min-h-[44px] ${searchType === type
                  ? ''
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                style={searchType === type ? { backgroundColor: 'var(--mt-highlight)', color: 'white' } : {}}
              >
                {type === 'book' ? <Book className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="space-y-3 sm:space-y-0 sm:flex sm:gap-2">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchType === 'movie'
                  ? (isTmdbAvailable()
                      ? 'Try: "Inception", "Christopher Nolan", "Tom Hanks 2000"'
                      : 'Try: "Inception", "The Matrix 1999"')
                  : 'Try: "Harry Potter", "author Rowling", "1984 by Orwell"'
                }
                className="w-full pl-4 pr-10 py-3 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              style={{ backgroundColor: 'var(--mt-highlight)', color: 'white' }}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>
          
          {/* Search tips */}
          {!hasSearched && (
            <div className="mt-3 p-3 bg-slate-700/30 border border-slate-600 rounded-lg">
              <p className="text-xs text-slate-400">
                {searchType === 'movie' ? (
                  isTmdbAvailable()
                    ? <>💡 <strong>Search tips:</strong> Search by title, person name (e.g. "Christopher Nolan"), or add a year to narrow results</>
                    : <>💡 <strong>Search tips:</strong> Search by title or add a year (e.g. "The Matrix 1999"). Add a TMDB API key in Settings to enable searching by person name.</>
                ) : (
                  <>💡 <strong>Search tips:</strong> Try "author [name]" or "[title] by [author]" for targeted searches</>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 pb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-slate-400">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              {results.some(result => result._personMatch) && (
                <div className="mb-4 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                  <p className="text-sm text-slate-200">
                    Showing movies from <strong>{results.find(r => r._personMatch)._personMatch}</strong>
                    {results.find(r => r._matchedAs) && ` (${results.find(r => r._matchedAs)._matchedAs})`}
                  </p>
                </div>
              )}
              {results.some(result => result._fuzzySearch) && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-200">
                    🔍 No exact matches found. Showing results for similar searches.
                  </p>
                </div>
              )}
              {results.some(result => result._relevanceScore !== undefined) && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-200">
                    ✨ Results ranked by relevance to your search criteria
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(result)}
                    className={`bg-slate-700/30 border rounded-lg p-3 transition cursor-pointer touch-manipulation relative ${focusedIndex === index
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 hover:border-blue-500'
                      }`}
                  >
                    {result._fuzzySearch && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Similar
                      </div>
                    )}
                    {result._relevanceScore !== undefined && result._relevanceScore > 50 && !result._fuzzySearch && (
                      <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                        ✓ Match
                      </div>
                    )}
                    {result.coverUrl && (
                      <img
                        src={result.coverUrl}
                        alt={result.title}
                        className="w-full h-40 sm:h-48 object-cover rounded mb-3"
                      />
                    )}
                    <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-2 leading-mobile">{result.title}</h3>
                    {result.author && (
                      <p className="text-xs text-slate-400 truncate">{result.author}</p>
                    )}
                    {result.director && (
                      <p className="text-xs text-slate-400 truncate">{result.director}</p>
                    )}
                    {result.year && (
                      <p className="text-xs text-slate-500 mt-1">{result.year}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : hasSearched && !loading && results.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-2">Try checking your spelling or using fewer words</p>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p>Search for {searchType}s to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
