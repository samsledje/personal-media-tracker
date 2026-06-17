// Markdown parsing and generation utilities
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import yaml from 'js-yaml';
import { getDefaultStatus } from '../constants/index.js';

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

/**
 * Normalize a parsed YAML value to the string-based shape the rest of the app
 * expects: scalars become strings, arrays become arrays of strings, and
 * null/undefined become empty strings. js-yaml types numbers/booleans, but
 * historically metadata values were always strings, so we preserve that.
 */
const normalizeMetaValue = (value) => {
  if (Array.isArray(value)) return value.map(v => (v == null ? '' : String(v)));
  if (value == null) return '';
  if (typeof value === 'object') return value; // unexpected, but don't lose it
  return String(value);
};

/**
 * Parse markdown content with YAML frontmatter
 * @param {string} content - Raw markdown content
 * @returns {object} Object with metadata and body
 */
export const parseMarkdown = (content) => {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) return { metadata: {}, body: content };

  const body = match[2].trim();

  let parsed;
  try {
    parsed = yaml.load(match[1]);
  } catch {
    // Malformed frontmatter — degrade gracefully rather than throw.
    return { metadata: {}, body };
  }

  const metadata = {};
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const [key, value] of Object.entries(parsed)) {
      metadata[key] = normalizeMetaValue(value);
    }
  }

  // Add default status for backward compatibility if not present
  if (!metadata.status && metadata.type) {
    metadata.status = getDefaultStatus(metadata.type);
  }

  return { metadata, body };
};

/**
 * Generate markdown content with YAML frontmatter
 * @param {object} item - Item object
 * @returns {string} Markdown content with frontmatter
 */
export const generateMarkdown = (item) => {
  // Build the frontmatter object in a stable field order, including only the
  // fields that are present (matching the historical output).
  const frontmatter = {
    title: item.title,
    type: item.type,
    status: item.status || getDefaultStatus(item.type)
  };

  if (item.author) frontmatter.author = item.author;
  if (item.director) frontmatter.director = item.director;
  if (item.actors) frontmatter.actors = item.actors;
  if (item.isbn) frontmatter.isbn = item.isbn;
  if (item.year) frontmatter.year = item.year;
  if (item.rating) frontmatter.rating = item.rating;
  if (item.tags && item.tags.length > 0) frontmatter.tags = item.tags;
  if (item.coverUrl) frontmatter.coverUrl = item.coverUrl;
  if (item.dateRead) frontmatter.dateRead = item.dateRead;
  if (item.dateWatched) frontmatter.dateWatched = item.dateWatched;
  frontmatter.dateAdded = item.dateAdded;

  // forceQuotes + double quotes -> string values are safely escaped;
  // flowLevel: 1 keeps arrays inline (tags: ["a", "b"]); lineWidth: -1
  // prevents js-yaml from wrapping long values across lines.
  const dumped = yaml.dump(frontmatter, {
    flowLevel: 1,
    forceQuotes: true,
    quotingType: '"',
    lineWidth: -1
  });

  return `---\n${dumped}---\n\n${item.review || ''}`;
};

/**
 * Render markdown text to HTML safely
 * @param {string} markdown - Markdown text to render
 * @returns {string} Sanitized HTML string
 */
export const renderMarkdown = (markdown) => {
  if (!markdown) return '';
  
  // Configure marked options
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // Enable GitHub Flavored Markdown
  });
  
  // Convert markdown to HTML
  const rawHtml = marked.parse(markdown);
  
  // Sanitize HTML to prevent XSS attacks
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'del', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
  });
  
  return cleanHtml;
};