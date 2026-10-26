import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { formatNotification } from '../hooks/utils';

describe('formatNotification', () => {
  const mockTimestamp = '2024-06-01T10:30:00.000Z';
  const baseData = {
    asset: 'Pump-01',
    signal: 'Current',
    status: 'CRITICAL',
    value: 55,
    min: 0,
    max: 50,
    percent: 10,
    timestamp: mockTimestamp,
  };

  it('includes the asset name', () => {
    expect(formatNotification(baseData)).toContain('Pump-01');
  });

  it('includes the signal name', () => {
    expect(formatNotification(baseData)).toContain('Current');
  });

  it('includes status and value', () => {
    const result = formatNotification(baseData);
    expect(result).toContain('CRITICAL');
    expect(result).toContain('55');
  });

  it('includes min and max range', () => {
    const result = formatNotification(baseData);
    expect(result).toContain('0');
    expect(result).toContain('50');
  });

  it('includes deviation percentage', () => {
    expect(formatNotification(baseData)).toContain('10%');
  });

  it('includes a formatted timestamp', () => {
    // Just check it includes a time-like string, locale-independent
    const result = formatNotification(baseData);
    expect(result).toContain('⏱');
  });

  it('starts with the bell emoji and asset', () => {
    expect(formatNotification(baseData)).toMatch(/^🔔 Pump-01/);
  });
});
