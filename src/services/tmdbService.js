import { getConfig, hasTmdbApiKey } from '../config.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export class TMDBError extends Error {
  constructor(message, type, statusCode = null) {
    super(message);
    this.name = 'TMDBError';
    this.type = type; // 'AUTH_FAILED', 'NOT_FOUND', 'RATE_LIMIT', 'NETWORK'
    this.statusCode = statusCode;
  }
}

const getApiKey = () => getConfig('tmdbApiKey');

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      throw new TMDBError(
        'TMDB API key is invalid or expired.',
        'AUTH_FAILED',
        401
      );
    }
    if (response.status === 429) {
      throw new TMDBError(
        'TMDB rate limit exceeded. Please try again later.',
        'RATE_LIMIT',
        429
      );
    }
    throw new TMDBError(
      `TMDB API error: ${response.status}`,
      'NETWORK',
      response.status
    );
  }
  return response.json();
};

const buildUrl = (path, params = {}) => {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
};

const mapMovieResult = (m) => ({
  title: m.title || m.original_title || '',
  director: '',
  actors: [],
  year: m.release_date ? m.release_date.slice(0, 4) : '',
  coverUrl: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : null,
  type: 'movie',
  tmdbID: m.id,
});

// Fetch director + top actors for a movie by its TMDB ID
const fetchCredits = async (tmdbID) => {
  try {
    const data = await fetch(buildUrl(`/movie/${tmdbID}/credits`)).then(handleResponse);
    const director = (data.crew || [])
      .filter((c) => c.job === 'Director')
      .map((c) => c.name)
      .join(', ');
    const actors = (data.cast || []).slice(0, 4).map((c) => c.name);
    return { director, actors };
  } catch {
    return { director: '', actors: [] };
  }
};

// Fetch full movie credits for a person (used when known_for is sparse)
const fetchPersonMovies = async (personId, department) => {
  const data = await fetch(
    buildUrl(`/person/${personId}/movie_credits`)
  ).then(handleResponse);

  if (department === 'Directing') {
    return (data.crew || [])
      .filter((c) => c.job === 'Director')
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
  // Acting
  return (data.cast || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
};

// Extract a trailing 4-digit year from a query string, return { cleanQuery, year }
const extractYear = (query) => {
  const match = query.trim().match(/^(.*?)\s*\b((?:19|20)\d{2})\b\s*$/);
  if (match) {
    return { cleanQuery: match[1].trim(), year: match[2] };
  }
  return { cleanQuery: query.trim(), year: null };
};

/**
 * Search for movies using TMDB's /search/multi endpoint.
 * Returns movie results merged with person filmography when a person is matched.
 */
export const searchMovies = async (query, limit = 12) => {
  if (!query || !query.trim()) {
    throw new Error('Query cannot be empty');
  }

  const { cleanQuery, year } = extractYear(query);

  const data = await fetch(
    buildUrl('/search/multi', { query: cleanQuery, page: 1 })
  ).then(handleResponse);

  const results = data.results || [];

  // Separate movies and people
  const movieResults = results.filter((r) => r.media_type === 'movie');
  const peopleResults = results.filter((r) => r.media_type === 'person');

  let mergedMovies = [];
  const seenIds = new Set();

  // Process top person match first: use known_for + full credits if sparse
  if (peopleResults.length > 0) {
    const topPerson = peopleResults[0];
    const personName = topPerson.name;
    const department = topPerson.known_for_department || 'Acting';
    const matchedAs = department === 'Directing' ? 'director' : 'actor';

    // Always fetch full credits for person matches — known_for only has ~3 entries
    // which is too sparse for a useful filmography view
    let personMovies;
    try {
      const fullCredits = await fetchPersonMovies(topPerson.id, department);
      personMovies = fullCredits.slice(0, year ? undefined : limit).map(mapMovieResult);
    } catch {
      // Fall back to known_for if credits call fails
      personMovies = (topPerson.known_for || [])
        .filter((m) => m.media_type === 'movie')
        .map(mapMovieResult);
    }

    // If a year was specified, filter to that year
    if (year) {
      personMovies = personMovies.filter((m) => m.year === year);
    }

    for (const m of personMovies.slice(0, limit)) {
      if (!seenIds.has(m.tmdbID)) {
        seenIds.add(m.tmdbID);
        mergedMovies.push({ ...m, _personMatch: personName, _matchedAs: matchedAs });
      }
    }
  }

  // Add remaining title-match movies, filtered by year if specified
  for (const m of movieResults) {
    if (year && (!m.release_date || m.release_date.slice(0, 4) !== year)) continue;
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      mergedMovies.push(mapMovieResult(m));
    }
  }

  // Slice to limit before fetching credits (avoid excessive API calls)
  mergedMovies = mergedMovies.slice(0, limit);

  // Fetch director + actors in parallel for all results
  const withCredits = await Promise.all(
    mergedMovies.map(async (movie) => {
      if (!movie.tmdbID) return movie;
      const credits = await fetchCredits(movie.tmdbID);
      return { ...movie, ...credits };
    })
  );

  return withCredits;
};

export const isServiceAvailable = () => hasTmdbApiKey();

export const validateApiKey = async (apiKey) => {
  const keyToTest = apiKey || getApiKey();
  if (!keyToTest) return false;
  try {
    const url = new URL(`${TMDB_BASE_URL}/configuration`);
    url.searchParams.set('api_key', keyToTest);
    const response = await fetch(url.toString());
    return response.ok;
  } catch {
    return false;
  }
};
