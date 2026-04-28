import Fuse from 'fuse.js';

/**
 * Fuzzy search utility for generating alternative search terms
 * Uses Fuse.js for fuzzy string matching and suggestion generation
 */

/**
 * Generate fuzzy search alternatives for a given query
 * @param {string} query - The original search query
 * @param {number} maxAlternatives - Maximum number of alternatives to generate (default: 3)
 * @returns {string[]} Array of alternative search terms
 */
export const generateFuzzyAlternatives = (query, maxAlternatives = 3) => {
    if (!query || query.trim().length < 3) {
        return [];
    }

    const trimmedQuery = query.trim();
    const alternatives = new Set();

    // Common spelling corrections and variations
    const corrections = {
        // Common misspellings
        'teh': 'the',
        'recieve': 'receive',
        'seperate': 'separate',
        'definately': 'definitely',
        'occured': 'occurred',
        'wierd': 'weird',
        'accomodate': 'accommodate',
        'begining': 'beginning',
        'beleive': 'believe',
        'buisness': 'business',
        'calender': 'calendar',
        'cemetary': 'cemetery',
        'commited': 'committed',
        'concious': 'conscious',
        'curiousity': 'curiosity',
        'dissapear': 'disappear',
        'exaggerate': 'exaggerate',
        'exhilarate': 'exhilarate',
        'flourescent': 'fluorescent',
        'garantee': 'guarantee',
        'grateful': 'grateful',
        'gaurantee': 'guarantee',
        'hieght': 'height',
        'hono(u)r': 'honor',
        'independant': 'independent',
        'knowlege': 'knowledge',
        'liason': 'liaison',
        'libary': 'library',
        'lightening': 'lightning',
        'maintainance': 'maintenance',
        'neccessary': 'necessary',
        'persue': 'pursue',
        'priviledge': 'privilege',
        'pronounciation': 'pronunciation',
        'reccommend': 'recommend',
        'rythm': 'rhythm',
        'seize': 'seize',
        'supercede': 'supersede',
        'tommorow': 'tomorrow',
        'tounge': 'tongue',
        'vaccuum': 'vacuum',
        'writting': 'writing'
    };

    // Apply direct corrections
    let corrected = trimmedQuery;
    for (const [wrong, right] of Object.entries(corrections)) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        corrected = corrected.replace(regex, right);
    }

    if (corrected !== trimmedQuery && !alternatives.has(corrected)) {
        alternatives.add(corrected);
    }

    // For long queries, prioritize partial matches first (most useful)
    if (trimmedQuery.length > 10) {
        const words = trimmedQuery.split(/\s+/);
        if (words.length > 2) {
            // Try searching with fewer words
            for (let i = Math.max(1, words.length - 2); i < words.length; i++) {
                const partial = words.slice(0, i).join(' ');
                if (partial.length > 2 && !alternatives.has(partial)) {
                    alternatives.add(partial);
                }
            }
        }
    }

    // Generate typo variations (limit to avoid too many alternatives)
    const variations = [
        // Remove double letters (e.g., "Innception" -> "Inception")
        trimmedQuery.replace(/(.)\1+/g, '$1'),
    ];

    // Add character transposition variations (swap adjacent characters)
    // This catches common typos like "Inceptoin" -> "Inception"
    // Only add first few to avoid explosion of alternatives
    const maxTranspositions = 3;
    const chars = trimmedQuery.split('');
    for (let i = 0; i < Math.min(trimmedQuery.length - 1, maxTranspositions); i++) {
        const charsCopy = [...chars]; // Create a copy for each iteration
        [charsCopy[i], charsCopy[i + 1]] = [charsCopy[i + 1], charsCopy[i]];
        const transposed = charsCopy.join('');
        if (transposed !== trimmedQuery && transposed.length > 2) {
            variations.push(transposed);
        }
    }

    // Add variations with single character removed (catches extra character typos)
    // Only add first few positions to avoid explosion
    const maxRemovals = 3;
    for (let i = 0; i < Math.min(trimmedQuery.length, maxRemovals); i++) {
        const variation = trimmedQuery.slice(0, i) + trimmedQuery.slice(i + 1);
        if (variation.length > 2) {
            variations.push(variation);
        }
    }

    variations.forEach(variation => {
        if (variation !== trimmedQuery && variation.length > 2 && !alternatives.has(variation)) {
            alternatives.add(variation);
        }
    });

    // Add more partial matches for shorter queries (that weren't handled above)
    if (trimmedQuery.length > 6 && trimmedQuery.length <= 10) {
        const words = trimmedQuery.split(/\s+/);
        if (words.length > 1) {
            // Try searching with fewer words
            for (let i = words.length - 1; i > 0; i--) {
                const partial = words.slice(0, i).join(' ');
                if (partial.length > 2 && !alternatives.has(partial)) {
                    alternatives.add(partial);
                }
            }
        }
    }

    // Convert to array and limit
    const result = Array.from(alternatives).slice(0, maxAlternatives);

    // Remove the original query if it somehow got added
    return result.filter(alt => alt !== trimmedQuery);
};

/**
 * Perform fuzzy search on a list of items
 * @param {string} query - Search query
 * @param {Array} items - Array of items to search
 * @param {Object} options - Fuse.js options
 * @returns {Array} Sorted search results
 */
export const fuzzySearch = (query, items, options = {}) => {
    if (!query || !items || items.length === 0) {
        return [];
    }

    const defaultOptions = {
        keys: ['title', 'author', 'director'],
        threshold: 0.4, // More lenient matching
        includeScore: true,
        ...options
    };

    const fuse = new Fuse(items, defaultOptions);
    const results = fuse.search(query);

    return results.map(result => ({
        ...result.item,
        _score: result.score
    }));
};

/**
 * Check if a search result set indicates no good matches
 * @param {Array} results - Search results
 * @param {number} minResults - Minimum number of results to consider successful
 * @returns {boolean} True if fuzzy search should be attempted
 */
export const shouldTryFuzzySearch = (results, minResults = 1) => {
    return !results || results.length < minResults;
};
