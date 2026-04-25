import { describe, it, expect } from 'vitest';
import { STATUS_TYPES, STATUS_LABELS, STATUS_ICONS, STATUS_COLORS } from '../../constants/index.js';
import { getStatusIcon, getStatusColorClass } from '../statusUtils.jsx';

describe('Status System', () => {
  describe('STATUS_TYPES', () => {
    it('should define status types for books', () => {
      expect(STATUS_TYPES.BOOK).toHaveProperty('TO_READ', 'to-read');
      expect(STATUS_TYPES.BOOK).toHaveProperty('READING', 'reading');
      expect(STATUS_TYPES.BOOK).toHaveProperty('READ', 'read');
      expect(STATUS_TYPES.BOOK).toHaveProperty('DNF', 'dnf');
    });

    it('should define status types for movies', () => {
      expect(STATUS_TYPES.MOVIE).toHaveProperty('TO_WATCH', 'to-watch');
      expect(STATUS_TYPES.MOVIE).toHaveProperty('WATCHING', 'watching');
      expect(STATUS_TYPES.MOVIE).toHaveProperty('WATCHED', 'watched');
      expect(STATUS_TYPES.MOVIE).toHaveProperty('DNF', 'dnf');
    });
  });

  describe('STATUS_LABELS', () => {
    it('should define labels for all statuses', () => {
      expect(STATUS_LABELS).toHaveProperty('to-read', 'To Read');
      expect(STATUS_LABELS).toHaveProperty('reading', 'Reading');
      expect(STATUS_LABELS).toHaveProperty('read', 'Read');
      expect(STATUS_LABELS).toHaveProperty('to-watch', 'To Watch');
      expect(STATUS_LABELS).toHaveProperty('watching', 'Watching');
      expect(STATUS_LABELS).toHaveProperty('watched', 'Watched');
      expect(STATUS_LABELS).toHaveProperty('dnf', 'Did Not Finish');
    });
  });

  describe('STATUS_ICONS', () => {
    it('should define icons for all statuses', () => {
      expect(STATUS_ICONS).toHaveProperty('to-read', 'layers');
      expect(STATUS_ICONS).toHaveProperty('reading', 'book-open');
      expect(STATUS_ICONS).toHaveProperty('read', 'check-circle');
      expect(STATUS_ICONS).toHaveProperty('to-watch', 'layers');
      expect(STATUS_ICONS).toHaveProperty('watching', 'play-circle');
      expect(STATUS_ICONS).toHaveProperty('watched', 'check-circle');
      expect(STATUS_ICONS).toHaveProperty('dnf', 'x-circle');
    });
  });

  describe('STATUS_COLORS', () => {
    it('should define colors for all statuses', () => {
      expect(STATUS_COLORS).toHaveProperty('to-read', 'blue');
      expect(STATUS_COLORS).toHaveProperty('reading', 'yellow');
      expect(STATUS_COLORS).toHaveProperty('read', 'green');
      expect(STATUS_COLORS).toHaveProperty('to-watch', 'blue');
      expect(STATUS_COLORS).toHaveProperty('watching', 'yellow');
      expect(STATUS_COLORS).toHaveProperty('watched', 'green');
      expect(STATUS_COLORS).toHaveProperty('dnf', 'red');
    });
  });

  describe('getStatusIcon', () => {
    it('should return a React element for each status', () => {
      const statuses = ['to-read', 'reading', 'read', 'to-watch', 'watching', 'watched', 'dnf'];
      for (const status of statuses) {
        const el = getStatusIcon(status);
        expect(el).not.toBeNull();
        expect(typeof el).toBe('object');
        expect(el.type).toBeDefined();
      }
    });

    it('should pass className prop to icon element', () => {
      expect(getStatusIcon('read', 'text-green-500').props.className).toBe('text-green-500');
      expect(getStatusIcon('dnf', 'w-4 h-4').props.className).toBe('w-4 h-4');
    });

    it('should return default icon for unknown status', () => {
      const el = getStatusIcon('unknown');
      expect(el).not.toBeNull();
      expect(typeof el).toBe('object');
    });
  });

  describe('getStatusColorClass', () => {
    it('should return correct color class for each status', () => {
      expect(getStatusColorClass('to-read')).toBe('bg-blue-500');
      expect(getStatusColorClass('reading')).toBe('bg-yellow-500');
      expect(getStatusColorClass('read')).toBe('bg-green-500');
      expect(getStatusColorClass('to-watch')).toBe('bg-blue-500');
      expect(getStatusColorClass('watching')).toBe('bg-yellow-500');
      expect(getStatusColorClass('watched')).toBe('bg-green-500');
      expect(getStatusColorClass('dnf')).toBe('bg-red-500');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColorClass('unknown')).toBe('bg-blue-500');
    });
  });
});