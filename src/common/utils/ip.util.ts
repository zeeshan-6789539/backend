import { isIP } from 'node:net';

// Returns the address only when Postgres' inet type will accept it
export const toIpAddressOrNull = (value: string | undefined): string | null =>
  value && isIP(value) !== 0 ? value : null;
