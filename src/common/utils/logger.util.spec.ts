import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IAppConfig } from '../../config/interfaces/i-app-config.js';
import { createAppLogger, toNestLogLevels } from './logger.util.js';

describe('createAppLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes through console.log so serverless hosts capture it', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const stdoutWrite = vi.spyOn(process.stdout, 'write');
    const logger = createAppLogger({ nodeEnv: 'production', logLevel: 'info' } as IAppConfig);

    logger.log('invoice sent', 'MailService');

    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(consoleLog.mock.calls[0]?.[0]).toContain('invoice sent');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });
});

describe('toNestLogLevels', () => {
  it('maps info to log and keeps every more severe level', () => {
    expect(toNestLogLevels('info')).toEqual(['fatal', 'error', 'warn', 'log']);
  });

  it('enables everything for trace', () => {
    expect(toNestLogLevels('trace')).toEqual([
      'fatal',
      'error',
      'warn',
      'log',
      'debug',
      'verbose',
    ]);
  });

  it('keeps only fatal for fatal', () => {
    expect(toNestLogLevels('fatal')).toEqual(['fatal']);
  });
});
