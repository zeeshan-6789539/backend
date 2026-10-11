import { describe, expect, it } from 'vitest';
import { daysAgo } from './date.util.js';

describe('daysAgo', () => {
  const from = new Date('2026-10-10T15:30:00.000Z');

  it('goes back the given number of days and pins the UTC hour', () => {
    expect(daysAgo(90, 9, from).toISOString()).toBe('2026-07-12T09:00:00.000Z');
  });

  it('returns today at the given hour for zero days', () => {
    expect(daysAgo(0, 18, from).toISOString()).toBe('2026-10-10T18:00:00.000Z');
  });
});
