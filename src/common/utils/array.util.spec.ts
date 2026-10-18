import { describe, expect, it } from 'vitest';
import { chunk } from './array.util.js';

describe('chunk', () => {
  it('splits into slices of the given size, with the remainder last', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns no slices for an empty list', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('rejects a size that is not a positive integer', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });
});
