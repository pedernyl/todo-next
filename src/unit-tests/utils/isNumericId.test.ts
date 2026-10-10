import { describe, it, expect } from 'vitest';
import { isNumericId } from '../../lib/utils/isNumericId';

describe('isNumericId', () => {
  it('should return true for numeric strings', () => {
    expect(isNumericId('123')).toBe(true);
  });

  it('should return true for numbers', () => {
    expect(isNumericId(123)).toBe(true);
  });

  it('should return false for id that starts with zero', () => {
    expect(isNumericId('0123')).toBe(false);
  });

  it('should return false for non-numeric strings', () => {
    expect(isNumericId('abc')).toBe(false);
  });

  it('should return false for strings with mixed characters', () => {
    expect(isNumericId('123abc')).toBe(false);
  });

  it('should return false for empty strings', () => {
    expect(isNumericId('')).toBe(false);
  });
});