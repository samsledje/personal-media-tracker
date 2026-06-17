import { describe, it, expect } from 'vitest';
import { parseMarkdown, generateMarkdown } from '../../utils/markdownUtils.js';

describe('markdownUtils', () => {
  describe('parseMarkdown', () => {
    it('should parse valid YAML frontmatter and content', () => {
      const markdown = `---
title: "Test Book"
author: "Test Author"
type: "book"
status: "read"
rating: 5
year: 1925
---

This is the note content.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.title).toBe('Test Book');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.metadata.type).toBe('book');
      expect(result.metadata.status).toBe('read');
      expect(result.metadata.rating).toBe('5');
      expect(result.metadata.year).toBe('1925');
      expect(result.body).toBe('This is the note content.');
    });

    it('should handle missing frontmatter', () => {
      const markdown = 'Just some content without frontmatter';
      const result = parseMarkdown(markdown);
      
      expect(result.metadata).toEqual({});
      expect(result.body).toBe(markdown);
    });

    it('should parse tags as arrays', () => {
      const markdown = `---
title: "Test"
type: "book"
tags: ["fiction", "classic", "american-literature"]
---

Notes here.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.tags).toEqual(['fiction', 'classic', 'american-literature']);
    });

    it('should parse actors as arrays', () => {
      const markdown = `---
title: "Test Movie"
type: "movie"
actors: ["Actor One", "Actor Two", "Actor Three"]
---

Movie notes.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.actors).toEqual(['Actor One', 'Actor Two', 'Actor Three']);
    });

    it('should handle special characters in frontmatter', () => {
      const markdown = `---
title: "Book: A Story"
author: "OBrien, Jr."
tags: ["sci-fi", "action"]
---

Content here.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.title).toBe('Book: A Story');
      expect(result.metadata.author).toBe("OBrien, Jr.");
      expect(result.metadata.tags).toEqual(['sci-fi', 'action']);
    });

    it('should handle empty body content', () => {
      const markdown = `---
title: "Test"
type: "book"
---

`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.title).toBe('Test');
      expect(result.body).toBe('');
    });

    it('should handle multiline notes in body', () => {
      const markdown = `---
title: "Test"
type: "book"
---

Line 1 of notes
Line 2 of notes
Line 3 of notes`;

      const result = parseMarkdown(markdown);
      
      expect(result.body).toBe('Line 1 of notes\nLine 2 of notes\nLine 3 of notes');
    });

    it('should add default status for books when missing', () => {
      const markdown = `---
title: "Test Book"
type: "book"
---

Notes.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.status).toBe('read');
    });

    it('should add default status for movies when missing', () => {
      const markdown = `---
title: "Test Movie"
type: "movie"
---

Notes.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.status).toBe('watched');
    });

    it('should not override existing status', () => {
      const markdown = `---
title: "Test Book"
type: "book"
status: "reading"
---

Notes.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.status).toBe('reading');
    });

    it('should preserve quotes inside properly-escaped frontmatter', () => {
      const markdown = `---
title: "The \\"Great\\" Gatsby"
author: 'F. Scott Fitzgerald'
---

Notes.`;

      const result = parseMarkdown(markdown);

      expect(result.metadata.title).toBe('The "Great" Gatsby');
      expect(result.metadata.author).toBe('F. Scott Fitzgerald');
    });

    it('should preserve commas inside array values', () => {
      const markdown = `---
title: "Test Movie"
type: "movie"
actors: ["Smith, John", "Doe, Jane"]
---

Notes.`;

      const result = parseMarkdown(markdown);

      expect(result.metadata.actors).toEqual(['Smith, John', 'Doe, Jane']);
    });
  });

  describe('generateMarkdown', () => {
    it('should generate valid markdown for a book', () => {
      const item = {
        title: 'Test Book',
        author: 'Test Author',
        type: 'book',
        status: 'read',
        rating: 5,
        year: 1925,
        tags: ['classic', 'fiction'],
        dateAdded: '2024-01-10',
        dateRead: '2024-01-15',
        review: 'Great book!',
      };

      const markdown = generateMarkdown(item);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "Test Book"');
      expect(markdown).toContain('type: "book"');
      expect(markdown).toContain('status: "read"');
      expect(markdown).toContain('author: "Test Author"');
      expect(markdown).toContain('rating: 5');
      expect(markdown).toContain('year: 1925');
      expect(markdown).toContain('tags: ["classic", "fiction"]');
      expect(markdown).toContain('dateAdded: "2024-01-10"');
      expect(markdown).toContain('dateRead: "2024-01-15"');
      expect(markdown).toContain('Great book!');
    });

    it('should generate valid markdown for a movie', () => {
      const item = {
        title: 'Test Movie',
        director: 'Test Director',
        type: 'movie',
        status: 'watched',
        rating: 4,
        year: 2020,
        tags: ['action', 'sci-fi'],
        actors: ['Actor One', 'Actor Two'],
        dateAdded: '2024-02-10',
        dateWatched: '2024-02-15',
        review: 'Amazing visuals!',
      };

      const markdown = generateMarkdown(item);
      
      expect(markdown).toContain('title: "Test Movie"');
      expect(markdown).toContain('type: "movie"');
      expect(markdown).toContain('status: "watched"');
      expect(markdown).toContain('director: "Test Director"');
      expect(markdown).toContain('actors: ["Actor One", "Actor Two"]');
      expect(markdown).toContain('rating: 4');
      expect(markdown).toContain('dateWatched: "2024-02-15"');
      expect(markdown).toContain('Amazing visuals!');
    });

    it('should handle items without optional fields', () => {
      const item = {
        title: 'Minimal Item',
        type: 'book',
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);
      
      expect(markdown).toContain('title: "Minimal Item"');
      expect(markdown).toContain('type: "book"');
      expect(markdown).toContain('status: "read"'); // Default status
      expect(markdown).toContain('dateAdded: "2024-01-01"');
      expect(markdown).not.toContain('author:');
      expect(markdown).not.toContain('rating:');
    });

    it('should add default status for book when missing', () => {
      const item = {
        title: 'Test Book',
        type: 'book',
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);

      expect(markdown).toContain('status: "read"');
    });

    it('should add default status for movie when missing', () => {
      const item = {
        title: 'Test Movie',
        type: 'movie',
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);

      expect(markdown).toContain('status: "watched"');
    });

    it('should handle empty tags array', () => {
      const item = {
        title: 'Test',
        type: 'book',
        tags: [],
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);
      
      expect(markdown).not.toContain('tags:');
    });

    it('should handle ISBN for books', () => {
      const item = {
        title: 'Test Book',
        type: 'book',
        isbn: '9780743273565',
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);
      
      expect(markdown).toContain('isbn: "9780743273565"');
    });

    it('should handle coverUrl', () => {
      const item = {
        title: 'Test',
        type: 'book',
        coverUrl: 'https://example.com/cover.jpg',
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);
      
      expect(markdown).toContain('coverUrl: "https://example.com/cover.jpg"');
    });

    it('should handle empty review', () => {
      const item = {
        title: 'Test',
        type: 'book',
        dateAdded: '2024-01-01',
        review: '',
      };

      const markdown = generateMarkdown(item);
      
      const lines = markdown.split('\n');
      expect(lines[lines.length - 1]).toBe('');
    });

    it('should escape special characters in title', () => {
      const item = {
        title: 'Book: "A Story"',
        type: 'book',
        dateAdded: '2024-01-01',
      };

      const markdown = generateMarkdown(item);

      // Quotes inside the value are escaped to keep the frontmatter valid YAML
      expect(markdown).toContain('title: "Book: \\"A Story\\""');
      // ...and it must round-trip back to the original title
      expect(parseMarkdown(markdown).metadata.title).toBe('Book: "A Story"');
    });
  });

  describe('parse and generate roundtrip', () => {
    it('should preserve data through parse -> generate cycle', () => {
      const original = {
        title: 'Test Book',
        author: 'Test Author',
        type: 'book',
        status: 'read',
        rating: 5,
        year: 1925,
        tags: ['classic', 'fiction'],
        dateAdded: '2024-01-10',
        dateRead: '2024-01-15',
        review: 'Great book!',
      };

      const markdown = generateMarkdown(original);
      const parsed = parseMarkdown(markdown);
      
      expect(parsed.metadata.title).toBe(original.title);
      expect(parsed.metadata.author).toBe(original.author);
      expect(parsed.metadata.type).toBe(original.type);
      expect(parsed.metadata.status).toBe(original.status);
      expect(parsed.metadata.rating).toBe(String(original.rating));
      expect(parsed.metadata.year).toBe(String(original.year));
      expect(parsed.metadata.tags).toEqual(original.tags);
      expect(parsed.body).toBe(original.review);
    });

    it('should round-trip values containing quotes, commas, and colons', () => {
      const original = {
        title: 'Dune: Part "Two", Revisited',
        type: 'movie',
        status: 'watched',
        director: 'Villeneuve, Denis',
        actors: ['Chalamet, Timothée', 'Zendaya'],
        tags: ['sci-fi', 'epic: space'],
        dateAdded: '2024-03-01',
        review: 'Great: a "must", really.',
      };

      const parsed = parseMarkdown(generateMarkdown(original));

      expect(parsed.metadata.title).toBe(original.title);
      expect(parsed.metadata.director).toBe(original.director);
      expect(parsed.metadata.actors).toEqual(original.actors);
      expect(parsed.metadata.tags).toEqual(original.tags);
      expect(parsed.body).toBe(original.review);
    });
  });

  describe('edge cases', () => {
    it('should handle filesystem-unfriendly characters in title', () => {
      const item = {
        title: 'Book: "A Story" / Path\\To\\File',
        type: 'book',
        dateAdded: '2024-01-01'
      };

      const markdown = generateMarkdown(item);
      const parsed = parseMarkdown(markdown);

      // Quotes and other special characters now round-trip losslessly
      expect(parsed.metadata.title).toBe('Book: "A Story" / Path\\To\\File');
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(500);
      const item = {
        title: longTitle,
        type: 'book',
        dateAdded: '2024-01-01'
      };

      const markdown = generateMarkdown(item);
      const parsed = parseMarkdown(markdown);
      
      expect(parsed.metadata.title).toBe(longTitle);
    });

    it('should handle special Unicode characters', () => {
      const item = {
        title: 'Book with émojis 🎬 and spéciál chárs',
        type: 'book',
        dateAdded: '2024-01-01'
      };

      const markdown = generateMarkdown(item);
      const parsed = parseMarkdown(markdown);
      
      expect(parsed.metadata.title).toBe('Book with émojis 🎬 and spéciál chárs');
    });

    it('should handle malformed YAML frontmatter gracefully', () => {
      const malformed = `---
title: "Unclosed quote
author: Test Author
---
Content`;

      const result = parseMarkdown(malformed);
      
      // Should not throw, should handle gracefully
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle empty YAML frontmatter', () => {
      // Empty frontmatter with newline between delimiters
      const empty = `---

---
Content`;

      const result = parseMarkdown(empty);
      
      expect(result.metadata).toEqual({});
      expect(result.body).toBe('Content');
    });

    it('should handle null and undefined values', () => {
      const item = {
        title: 'Test',
        type: 'book',
        author: null,
        year: undefined,
        rating: null,
        dateAdded: '2024-01-01'
      };

      const markdown = generateMarkdown(item);
      
      // Should not include null/undefined fields
      expect(markdown).not.toContain('author: null');
      expect(markdown).not.toContain('year: undefined');
    });
  });
});
