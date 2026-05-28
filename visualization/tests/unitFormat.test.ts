import { describe, it, expect } from 'vitest';
import { formatValue, formatTime, formatQuantity, formatVector } from '../src/utils/unitFormat';

describe('unitFormat', () => {
  it('formatValue handles zero', () => {
    expect(formatValue(0)).toBe('0');
    expect(formatValue(1e-15)).toBe('0');
  });

  it('formatValue handles normal numbers', () => {
    expect(formatValue(3.14159, 2)).toBe('3.14');
    expect(formatValue(-9.8, 1)).toBe('-9.8');
  });

  it('formatValue handles very large numbers', () => {
    expect(formatValue(1e8)).toContain('e');
  });

  it('formatValue handles very small numbers', () => {
    expect(formatValue(1e-7)).toContain('e');
  });

  it('formatTime formats with s suffix', () => {
    expect(formatTime(3.14)).toBe('3.14 s');
    expect(formatTime(0)).toBe('0.00 s');
  });

  it('formatQuantity includes unit', () => {
    expect(formatQuantity(9.8, 'm/s²', 1)).toBe('9.8 m/s²');
  });

  it('formatVector shows components', () => {
    const result = formatVector(3, 4, 'm/s', 1);
    expect(result).toContain('3.0');
    expect(result).toContain('4.0');
    expect(result).toContain('m/s');
  });
});
