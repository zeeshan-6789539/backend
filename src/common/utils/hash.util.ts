import { createHash, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

// OWASP argon2id baseline: 19 MiB memory, 2 iterations, 1 lane
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const hashSecret = (plain: string): Promise<string> =>
  hash(plain, ARGON2_OPTIONS);

export const verifySecret = async (
  digest: string,
  plain: string,
): Promise<boolean> => {
  try {
    return await verify(digest, plain);
  } catch {
    return false;
  }
};

// For long random tokens only; passwords need the slow argon2 hash above
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const verifyTokenHash = (digest: string, token: string): boolean => {
  const expected = Buffer.from(digest, 'hex');
  const actual = createHash('sha256').update(token).digest();

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
