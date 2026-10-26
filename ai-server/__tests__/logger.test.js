import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const { default: logger } = await import('../utils/logger.js');

describe('logger', () => {
  let consoleSpy;

  afterEach(() => {
    if (consoleSpy) consoleSpy.mockRestore();
  });

  it('exports info, error, and warn functions', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('logger.info calls console.log with ISO timestamp and INFO', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('test message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const args = consoleSpy.mock.calls[0];
    expect(args[1]).toBe('INFO');
    expect(args[2]).toBe('test message');
  });

  it('logger.error calls console.error with ISO timestamp and ERROR', () => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something went wrong');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const args = consoleSpy.mock.calls[0];
    expect(args[1]).toBe('ERROR');
    expect(args[2]).toBe('something went wrong');
  });

  it('logger.warn calls console.warn with ISO timestamp and WARN', () => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('be careful');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const args = consoleSpy.mock.calls[0];
    expect(args[1]).toBe('WARN');
    expect(args[2]).toBe('be careful');
  });

  it('logger.info includes an ISO date string as first arg', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello');
    const firstArg = consoleSpy.mock.calls[0][0];
    expect(firstArg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('supports multiple arguments', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('msg', 'extra1', 'extra2');
    const args = consoleSpy.mock.calls[0];
    expect(args).toContain('extra1');
    expect(args).toContain('extra2');
  });
});
