import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isTyping, isMobileScreen, getTodayDate, autoUpdateDateOnStatusChange } from '../commonUtils.js';

describe('commonUtils', () => {
  describe('isTyping', () => {
    it('should return true when user is typing in an input', () => {
      // Mock document.activeElement
      const mockInput = { tagName: 'INPUT' };
      Object.defineProperty(document, 'activeElement', {
        value: mockInput,
        writable: true
      });

      expect(isTyping()).toBe(true);
    });

    it('should return true when user is typing in a textarea', () => {
      const mockTextarea = { tagName: 'TEXTAREA' };
      Object.defineProperty(document, 'activeElement', {
        value: mockTextarea,
        writable: true
      });

      expect(isTyping()).toBe(true);
    });

    it('should return true when user is typing in a contenteditable element', () => {
      const mockEditable = { tagName: 'DIV', isContentEditable: true };
      Object.defineProperty(document, 'activeElement', {
        value: mockEditable,
        writable: true
      });

      expect(isTyping()).toBe(true);
    });

    it('should return true when user is typing in an element with textbox role', () => {
      const mockTextbox = { tagName: 'DIV', getAttribute: () => 'textbox' };
      Object.defineProperty(document, 'activeElement', {
        value: mockTextbox,
        writable: true
      });

      expect(isTyping()).toBe(true);
    });

    it('should return false when no active element', () => {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        writable: true
      });

      expect(isTyping()).toBe(false);
    });

    it('should return false when active element is not an input type', () => {
      const mockButton = { tagName: 'BUTTON' };
      Object.defineProperty(document, 'activeElement', {
        value: mockButton,
        writable: true
      });

      expect(isTyping()).toBe(false);
    });
  });

  describe('isMobileScreen', () => {
    let originalInnerWidth;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true
      });
    });

    it('should return true for mobile screen width (< 640px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 639,
        writable: true
      });

      expect(isMobileScreen()).toBe(true);
    });

    it('should return false for desktop screen width (>= 640px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 640,
        writable: true
      });

      expect(isMobileScreen()).toBe(false);
    });

    it('should return false for larger screen widths', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true
      });

      expect(isMobileScreen()).toBe(false);
    });
  });

  describe('getTodayDate', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const today = getTodayDate();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Verify it's actually today's date in local timezone
      const now = new Date();
      const expectedYear = now.getFullYear();
      const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(now.getDate()).padStart(2, '0');
      const expectedDate = `${expectedYear}-${expectedMonth}-${expectedDay}`;
      expect(today).toBe(expectedDate);
    });
  });

  describe('autoUpdateDateOnStatusChange', () => {
    describe('for books', () => {
      it('should auto-update dateRead when status changes to "read"', () => {
        const item = {
          id: '1',
          title: 'Test Book',
          type: 'book',
          status: 'reading'
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'read', 'reading');
        
        expect(result.status).toBe('read');
        expect(result.dateRead).toBeDefined();
        expect(result.dateRead).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should not update dateRead if already set', () => {
        const existingDate = '2024-01-15';
        const item = {
          id: '1',
          title: 'Test Book',
          type: 'book',
          status: 'reading',
          dateRead: existingDate
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'read', 'reading');
        
        expect(result.status).toBe('read');
        expect(result.dateRead).toBe(existingDate);
      });

      it('should not update dateRead when changing to non-completed status', () => {
        const item = {
          id: '1',
          title: 'Test Book',
          type: 'book',
          status: 'to-read'
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'reading', 'to-read');
        
        expect(result.status).toBe('reading');
        expect(result.dateRead).toBeUndefined();
      });

      it('should not update dateRead when status is already "read"', () => {
        const item = {
          id: '1',
          title: 'Test Book',
          type: 'book',
          status: 'read'
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'read', 'read');
        
        expect(result.status).toBe('read');
        expect(result.dateRead).toBeUndefined();
      });
    });

    describe('for movies', () => {
      it('should auto-update dateWatched when status changes to "watched"', () => {
        const item = {
          id: '1',
          title: 'Test Movie',
          type: 'movie',
          status: 'watching'
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'watched', 'watching');
        
        expect(result.status).toBe('watched');
        expect(result.dateWatched).toBeDefined();
        expect(result.dateWatched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should not update dateWatched if already set', () => {
        const existingDate = '2024-02-20';
        const item = {
          id: '1',
          title: 'Test Movie',
          type: 'movie',
          status: 'watching',
          dateWatched: existingDate
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'watched', 'watching');
        
        expect(result.status).toBe('watched');
        expect(result.dateWatched).toBe(existingDate);
      });

      it('should not update dateWatched when changing to non-completed status', () => {
        const item = {
          id: '1',
          title: 'Test Movie',
          type: 'movie',
          status: 'to-watch'
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'watching', 'to-watch');
        
        expect(result.status).toBe('watching');
        expect(result.dateWatched).toBeUndefined();
      });

      it('should not update dateWatched when status is already "watched"', () => {
        const item = {
          id: '1',
          title: 'Test Movie',
          type: 'movie',
          status: 'watched'
        };
        
        const result = autoUpdateDateOnStatusChange(item, 'watched', 'watched');
        
        expect(result.status).toBe('watched');
        expect(result.dateWatched).toBeUndefined();
      });
    });

    it('should work without oldStatus parameter', () => {
      const item = {
        id: '1',
        title: 'Test Book',
        type: 'book',
        status: 'reading'
      };
      
      const result = autoUpdateDateOnStatusChange(item, 'read');
      
      expect(result.status).toBe('read');
      expect(result.dateRead).toBeDefined();
    });

    it('should throw error when item is null', () => {
      expect(() => autoUpdateDateOnStatusChange(null, 'read')).toThrow(TypeError);
      expect(() => autoUpdateDateOnStatusChange(null, 'read')).toThrow('item parameter is required');
    });

    it('should throw error when item is undefined', () => {
      expect(() => autoUpdateDateOnStatusChange(undefined, 'read')).toThrow(TypeError);
      expect(() => autoUpdateDateOnStatusChange(undefined, 'read')).toThrow('item parameter is required');
    });
  });
});