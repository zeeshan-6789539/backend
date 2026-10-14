import type { DefaultExport } from './interfaces/default-export.type.js';

// Unwraps a default import that some toolchains resolve to the CJS module object instead of its default export
export const interopDefault = <T>(imported: T): DefaultExport<T> =>
  (typeof imported === 'object' && imported !== null && 'default' in imported
    ? imported.default
    : imported) as DefaultExport<T>;
