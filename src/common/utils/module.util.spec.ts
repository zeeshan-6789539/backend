import { describe, expect, it } from 'vitest';
import { interopDefault } from './module.util.js';

describe('interopDefault', () => {
  it('returns a function import untouched', () => {
    const middleware = (): string => 'ok';

    expect(interopDefault(middleware)).toBe(middleware);
  });

  it('unwraps the default export of a CJS module object', () => {
    const middleware = (): string => 'ok';

    expect(interopDefault({ default: middleware })).toBe(middleware);
  });
});
