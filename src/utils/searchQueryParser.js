/**
 * Enhanced query parser for detecting search intent and extracting metadata
 * Helps identify if user is searching by director, actor, year, or series
 */

/**
 * Keywords that indicate director search
 */
const DIRECTOR_KEYWORDS = [
  'directed by',
  'director',
  'dir by',
  'by',
  'from'
];

/**
 * Keywords that indicate actor search
 */
const ACTOR_KEYWORDS = [
  'starring',
  'with',
  'actor',
  'actress',
  'stars',
  'featuring'
];

/**
 * Keywords that indicate author search (books)
 */
const AUTHOR_KEYWORDS = [
  'written by',
  'author'
];

/**
 * Keywords that indicate series/franchise search
 */
const SERIES_KEYWORDS = [
  'series',
  'franchise',
  'trilogy',
  'saga',
  'collection'
];

/**
 * Pre-compiled regex patterns for director keywords
 * Maps keyword to regex pattern
 */
const DIRECTOR_PATTERNS = {};
DIRECTOR_KEYWORDS.forEach(keyword => {
  DIRECTOR_PATTERNS[keyword] = new RegExp(`(.+?)\\s+${keyword}\\s+(.+?)(?:\\s+\\d{4})?$`, 'i');
});

/**
 * Pre-compiled regex patterns for actor keywords
 * Maps keyword to regex pattern
 */
const ACTOR_PATTERNS = {};
ACTOR_KEYWORDS.forEach(keyword => {
  ACTOR_PATTERNS[keyword] = new RegExp(`(.+?)\\s+${keyword}\\s+(.+?)(?:\\s+\\d{4})?$`, 'i');
});

/**
 * Pre-compiled regex patterns for author keywords
 * Maps keyword to regex pattern
 */
const AUTHOR_PATTERNS = {};
AUTHOR_KEYWORDS.forEach(keyword => {
  AUTHOR_PATTERNS[keyword] = new RegExp(`(.+?)\\s+${keyword}\\s+(.+?)(?:\\s+\\d{4})?$`, 'i');
});

/**
 * Parse a search query to detect search intent and extract metadata
 * @param {string} query - The search query
 * @returns {object} Parsed query information
 */
export const parseSearchQuery = (query) => {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return {
      original: '',
      titleKeywords: [],
      director: null,
      actor: null,
      author: null,
      year: null,
      yearRange: null,
      isSeries: false,
      searchType: 'title'
    };
  }

  const lowerQuery = query.toLowerCase().trim();
  const result = {
    original: query.trim(),
    titleKeywords: [],
    director: null,
    actor: null,
    author: null,
    year: null,
    yearRange: null,
    isSeries: false,
    searchType: 'title'
  };

  // Check for series indicators
  result.isSeries = SERIES_KEYWORDS.some(keyword => lowerQuery.includes(keyword));

  // Extract year (4-digit number)
  const yearMatch = lowerQuery.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    result.year = yearMatch[1];
  }

  // Extract year range (e.g., "2010-2015" or "2010 to 2015")
  const rangeMatch = lowerQuery.match(/\b(19\d{2}|20\d{2})\s*(?:-|to)\s*(19\d{2}|20\d{2})\b/);
  if (rangeMatch) {
    result.yearRange = { start: rangeMatch[1], end: rangeMatch[2] };
    result.year = null; // Clear single year if range is found
  }

  // Check for author search FIRST — must run before director detection
  // because DIRECTOR_KEYWORDS contains "by", which would match "written by Name"
  for (const keyword of AUTHOR_KEYWORDS) {
    const authorPattern = AUTHOR_PATTERNS[keyword];
    const match = query.match(authorPattern);
    if (match) {
      const afterKeyword = match[2].trim();
      if (afterKeyword.length > 2) {
        result.author = afterKeyword.replace(/\s+\d{4}$/, '').trim();
        result.titleKeywords = match[1].trim() ? [match[1].trim()] : [];
        result.searchType = 'author';
      }
      break;
    }

    // Try simpler pattern: just "author Name"
    if (lowerQuery.startsWith(keyword + ' ')) {
      const authorName = query.substring(keyword.length).trim().replace(/\s+\d{4}$/, '');
      if (authorName.length > 2) {
        result.author = authorName;
        result.searchType = 'author';
        break;
      }
    }
  }

  // Check for director search (only if not author search)
  if (!result.author) {
    for (const keyword of DIRECTOR_KEYWORDS) {
      const directorPattern = DIRECTOR_PATTERNS[keyword];
      const match = query.match(directorPattern);
      if (match) {
        // Check which group has the director name
        if (keyword === 'by' || keyword === 'from') {
          // "Title by Director" or "by Director"
          const beforeKeyword = match[1].trim();
          const afterKeyword = match[2].trim();

          if (beforeKeyword && afterKeyword.length > 2) {
            result.director = afterKeyword.replace(/\s+\d{4}$/, '').trim();
            result.titleKeywords = beforeKeyword ? [beforeKeyword] : [];
            result.searchType = 'director';
          }
        } else {
          // "directed by Director" or "director Name"
          const afterKeyword = match[2].trim();
          if (afterKeyword.length > 2) {
            result.director = afterKeyword.replace(/\s+\d{4}$/, '').trim();
            result.titleKeywords = match[1].trim() ? [match[1].trim()] : [];
            result.searchType = 'director';
          }
        }
        break;
      }

      // Try simpler pattern: just "director Name"
      if (lowerQuery.startsWith(keyword + ' ')) {
        const directorName = query.substring(keyword.length).trim().replace(/\s+\d{4}$/, '');
        if (directorName.length > 2) {
          result.director = directorName;
          result.searchType = 'director';
          break;
        }
      }
    }
  }

  // Check for actor search (only if not director or author search)
  if (!result.director && !result.author) {
    for (const keyword of ACTOR_KEYWORDS) {
      const actorPattern = ACTOR_PATTERNS[keyword];
      const match = query.match(actorPattern);
      if (match) {
        if (keyword === 'with' || keyword === 'featuring') {
          // "Title with Actor"
          const beforeKeyword = match[1].trim();
          const afterKeyword = match[2].trim();

          if (beforeKeyword && afterKeyword.length > 2) {
            result.actor = afterKeyword.replace(/\s+\d{4}$/, '').trim();
            result.titleKeywords = [beforeKeyword];
            result.searchType = 'actor';
          }
        } else {
          // "starring Actor" or "actor Name"
          const afterKeyword = match[2].trim();
          if (afterKeyword.length > 2) {
            result.actor = afterKeyword.replace(/\s+\d{4}$/, '').trim();
            result.titleKeywords = match[1].trim() ? [match[1].trim()] : [];
            result.searchType = 'actor';
          }
        }
        break;
      }

      // Try simpler pattern: just "actor Name"
      if (lowerQuery.startsWith(keyword + ' ')) {
        const actorName = query.substring(keyword.length).trim().replace(/\s+\d{4}$/, '');
        if (actorName.length > 2) {
          result.actor = actorName;
          result.searchType = 'actor';
          break;
        }
      }
    }
  }

  // If no director, actor, or author, treat as title search
  if (!result.director && !result.actor && !result.author) {
    // Remove year and series keywords to get cleaner title
    let cleanQuery = query;
    if (result.year) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${result.year}\\b`, 'g'), '');
    }
    if (result.yearRange) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${result.yearRange.start}\\s*(?:-|to)\\s*${result.yearRange.end}\\b`, 'g'), '');
    }
    
    SERIES_KEYWORDS.forEach(keyword => {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
    });
    
    cleanQuery = cleanQuery.trim();
    if (cleanQuery) {
      result.titleKeywords = [cleanQuery];
    }
  }

  return result;
};

/**
 * Generate search variations based on parsed query
 * @param {object} parsedQuery - Result from parseSearchQuery
 * @returns {string[]} Array of search term variations to try
 */
export const generateSearchVariations = (parsedQuery) => {
  const variations = [];

  if (!parsedQuery) {
    return variations;
  }

  const personName = parsedQuery.director || parsedQuery.actor;

  // For director/actor-only searches (no title), use the person's name directly.
  // Do NOT send "director Nolan" as a title query — OMDb would find nothing.
  if (personName && parsedQuery.titleKeywords.length === 0) {
    variations.push(personName);
    return variations;
  }

  // Always include original query for non-person-only searches
  if (parsedQuery.original) {
    variations.push(parsedQuery.original);
  }

  // For director/actor searches with a title, also try just the title keywords
  if (personName && parsedQuery.titleKeywords.length > 0) {
    parsedQuery.titleKeywords.forEach(keyword => {
      if (keyword && !variations.includes(keyword)) {
        variations.push(keyword);
      }
    });
  }

  // For searches with year, try without year
  if (parsedQuery.year && parsedQuery.titleKeywords.length > 0) {
    parsedQuery.titleKeywords.forEach(keyword => {
      if (keyword && !variations.includes(keyword)) {
        variations.push(keyword);
      }
    });
  }

  // For series searches, try removing series keywords
  if (parsedQuery.isSeries && parsedQuery.titleKeywords.length > 0) {
    parsedQuery.titleKeywords.forEach(keyword => {
      if (keyword && !variations.includes(keyword)) {
        variations.push(keyword);
      }
    });
  }

  return variations.filter(v => v && v.length > 0);
};

/**
 * Check if a movie result matches the search criteria
 * @param {object} movie - Movie object with title, director, actors, year
 * @param {object} parsedQuery - Parsed query from parseSearchQuery
 * @returns {number} Relevance score (0-100, higher is better match)
 */
export const scoreMovieMatch = (movie, parsedQuery) => {
  if (!movie || !parsedQuery) {
    return 0;
  }

  let score = 0;

  // Year match (exact)
  if (parsedQuery.year && movie.year) {
    const movieYear = String(movie.year).slice(0, 4); // Handle "1999", "1999-2003" formats
    if (movieYear === parsedQuery.year) {
      score += 30;
    } else {
      // Penalize if year specified but doesn't match
      score -= 10;
    }
  }

  // Year range match
  if (parsedQuery.yearRange && movie.year) {
    const movieYear = parseInt(String(movie.year).slice(0, 4));
    const startYear = parseInt(parsedQuery.yearRange.start);
    const endYear = parseInt(parsedQuery.yearRange.end);
    
    if (movieYear >= startYear && movieYear <= endYear) {
      score += 25;
    } else {
      score -= 10;
    }
  }

  // Director match
  if (parsedQuery.director && movie.director) {
    const directorLower = movie.director.toLowerCase();
    const queryDirectorLower = parsedQuery.director.toLowerCase();
    
    // Exact match
    if (directorLower === queryDirectorLower) {
      score += 40;
    }
    // Contains match (e.g., "Nolan" matches "Christopher Nolan")
    else if (directorLower.includes(queryDirectorLower) || queryDirectorLower.includes(directorLower)) {
      score += 35;
    }
    // Last name match
    else {
      const directorLastName = directorLower.split(' ').pop();
      const queryLastName = queryDirectorLower.split(' ').pop();
      if (directorLastName === queryLastName) {
        score += 30;
      } else {
        // Penalize if director specified but doesn't match
        score -= 15;
      }
    }
  }

  // Actor match
  if (parsedQuery.actor && movie.actors && Array.isArray(movie.actors)) {
    const queryActorLower = parsedQuery.actor.toLowerCase();
    const actorMatch = movie.actors.some(actor => {
      const actorLower = actor.toLowerCase();
      // Exact match
      if (actorLower === queryActorLower) {
        return true;
      }
      // Contains match
      if (actorLower.includes(queryActorLower) || queryActorLower.includes(actorLower)) {
        return true;
      }
      // Last name match
      const actorLastName = actorLower.split(' ').pop();
      const queryLastName = queryActorLower.split(' ').pop();
      return actorLastName === queryLastName;
    });
    
    if (actorMatch) {
      score += 35;
    } else {
      // Penalize if actor specified but doesn't match
      score -= 15;
    }
  }

  // Title match (if title keywords specified)
  if (parsedQuery.titleKeywords.length > 0 && movie.title) {
    const titleLower = movie.title.toLowerCase();
    const hasMatch = parsedQuery.titleKeywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      return titleLower.includes(keywordLower) || keywordLower.includes(titleLower);
    });
    
    if (hasMatch) {
      score += 20;
    }
  }

  // Bonus for exact title match (when searching by title only)
  if (parsedQuery.searchType === 'title' && parsedQuery.titleKeywords.length > 0 && movie.title) {
    const titleLower = movie.title.toLowerCase();
    const firstKeyword = parsedQuery.titleKeywords[0].toLowerCase();
    if (titleLower === firstKeyword) {
      score += 15;
    }
  }

  return Math.max(0, score); // Don't return negative scores
};

/**
 * Filter and rank movie results based on search criteria
 * @param {object[]} movies - Array of movie objects
 * @param {object} parsedQuery - Parsed query from parseSearchQuery
 * @param {number} minScore - Minimum score to include (default: 0)
 * @returns {object[]} Filtered and sorted array of movies with scores
 */
export const filterAndRankResults = (movies, parsedQuery, minScore = 0) => {
  if (!movies || !Array.isArray(movies) || movies.length === 0) {
    return [];
  }

  if (!parsedQuery) {
    return movies;
  }

  // Score each movie
  const scoredMovies = movies.map(movie => ({
    ...movie,
    _relevanceScore: scoreMovieMatch(movie, parsedQuery)
  }));

  // Filter by minimum score and sort by score (descending)
  return scoredMovies
    .filter(movie => movie._relevanceScore >= minScore)
    .sort((a, b) => b._relevanceScore - a._relevanceScore);
};
