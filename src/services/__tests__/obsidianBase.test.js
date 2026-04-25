import { describe, it, expect } from 'vitest';
import { OBSIDIAN_BASE_CONTENT, OBSIDIAN_BASE_FILENAME } from '../obsidianBase.js';

describe('obsidianBase', () => {
  describe('OBSIDIAN_BASE_CONTENT', () => {
    it('should be a valid YAML string', () => {
      expect(typeof OBSIDIAN_BASE_CONTENT).toBe('string');
      expect(OBSIDIAN_BASE_CONTENT.length).toBeGreaterThan(0);
    });

    it('should contain views section', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('views:');
    });

    it('should contain table view configuration', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('type: table');
      expect(OBSIDIAN_BASE_CONTENT).toContain('name: All');
    });

    it('should contain cards view for books', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('name: Books');
      expect(OBSIDIAN_BASE_CONTENT).toContain('type == "book"');
    });

    it('should contain cards view for movies', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('name: Movies');
      expect(OBSIDIAN_BASE_CONTENT).toContain('type == "movie"');
    });

    it('should include all required fields in order section', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('- title');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- rating');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- status');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- author');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- director');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- year');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- file.tags');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- dateAdded');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- dateRead');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- dateWatched');
      expect(OBSIDIAN_BASE_CONTENT).toContain('- type');
    });

    it('should include sort configuration', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('sort:');
      expect(OBSIDIAN_BASE_CONTENT).toContain('property: title');
      expect(OBSIDIAN_BASE_CONTENT).toContain('direction: ASC');
      expect(OBSIDIAN_BASE_CONTENT).toContain('property: rating');
      expect(OBSIDIAN_BASE_CONTENT).toContain('direction: DESC');
    });

    it('should include column size configuration', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('columnSize:');
      expect(OBSIDIAN_BASE_CONTENT).toContain('note.title:');
      expect(OBSIDIAN_BASE_CONTENT).toContain('note.status:');
      expect(OBSIDIAN_BASE_CONTENT).toContain('note.author:');
      expect(OBSIDIAN_BASE_CONTENT).toContain('note.director:');
    });

    it('should include image configuration for card views', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('image: note.coverUrl');
      expect(OBSIDIAN_BASE_CONTENT).toContain('imageFit: contain');
    });

    it('should have proper YAML structure with correct indentation', () => {
      const lines = OBSIDIAN_BASE_CONTENT.split('\n');
      let indentLevel = 0;
      let prevIndent = 0;
      
      for (const line of lines) {
        if (line.trim() === '' || line.trim().startsWith('#')) continue;
        
        const currentIndent = line.match(/^(\s*)/)[1].length;
        
        // Check that indentation is consistent (multiples of 2)
        if (currentIndent > 0) {
          expect(currentIndent % 2).toBe(0);
        }
        
        prevIndent = currentIndent;
      }
    });

    it('should not contain syntax errors', () => {
      // Basic validation: should not have unmatched brackets or quotes
      const openBrackets = (OBSIDIAN_BASE_CONTENT.match(/\[/g) || []).length;
      const closeBrackets = (OBSIDIAN_BASE_CONTENT.match(/\]/g) || []).length;
      expect(openBrackets).toBe(closeBrackets);
    });

    it('should have all three views defined', () => {
      // Match "- type:" with optional leading whitespace
      const viewMatches = OBSIDIAN_BASE_CONTENT.match(/^\s+- type:/gm);
      expect(viewMatches).toHaveLength(3); // table, cards (books), cards (movies)
    });

    it('should have filters defined for card views', () => {
      expect(OBSIDIAN_BASE_CONTENT).toContain('filters:');
      expect(OBSIDIAN_BASE_CONTENT).toContain('and:');
    });
  });

  describe('OBSIDIAN_BASE_FILENAME', () => {
    it('should be a string', () => {
      expect(typeof OBSIDIAN_BASE_FILENAME).toBe('string');
    });

    it('should have correct filename', () => {
      expect(OBSIDIAN_BASE_FILENAME).toBe('Markdown Media Tracker.base');
    });

    it('should end with .base extension', () => {
      expect(OBSIDIAN_BASE_FILENAME).toMatch(/\.base$/);
    });

    it('should not be empty', () => {
      expect(OBSIDIAN_BASE_FILENAME.length).toBeGreaterThan(0);
    });
  });
});

