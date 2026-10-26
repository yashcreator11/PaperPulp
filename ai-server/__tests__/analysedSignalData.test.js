// With --experimental-vm-modules, jest globals must be explicitly imported
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ESM mocks must be registered BEFORE dynamic import of the module under test
await jest.unstable_mockModule('dotenv/config', () => ({}));

await jest.unstable_mockModule('mssql', () => ({
  default: { connect: jest.fn(), close: jest.fn() },
}));

await jest.unstable_mockModule('../utils/utils.js', () => ({
  sqlConfig: { user: 'test', password: 'test', database: 'testdb', server: 'localhost' },
  extractSignalValues: jest.fn(),
  buildObservations: jest.fn(),
  correlateSignals: jest.fn(),
  ensureCollection: jest.fn(),
}));

// Dynamic import AFTER mocks are registered
const { getThresholdViolations, getDataForLLM } = await import('../services/analysedSignalData.js');

// ─── getThresholdViolations ───────────────────────────────────────────────────

const makeSignal = (value, min, max, name = 'TestSignal') => ({
  signalName: name,
  value,
  minThreshold: min,
  maxThreshold: max,
  assetId: 'asset-001',
  timeMs: Date.now(),
});

describe('getThresholdViolations', () => {
  it('returns empty array when data is null', () => {
    expect(getThresholdViolations(null)).toEqual([]);
  });

  it('returns empty array when data is undefined', () => {
    expect(getThresholdViolations(undefined)).toEqual([]);
  });

  it('returns empty array when cleanedSignals is missing', () => {
    expect(getThresholdViolations({})).toEqual([]);
  });

  it('returns empty array when all signals are within range', () => {
    const data = { cleanedSignals: [makeSignal(25, 0, 50), makeSignal(10, 0, 50)] };
    expect(getThresholdViolations(data)).toEqual([]);
  });

  it('detects signals above max threshold', () => {
    const data = { cleanedSignals: [makeSignal(75, 0, 50, 'Current')] };
    const violations = getThresholdViolations(data);
    expect(violations).toHaveLength(1);
    expect(violations[0].signalName).toBe('Current');
  });

  it('detects signals below min threshold', () => {
    const data = { cleanedSignals: [makeSignal(-5, 0, 50, 'Voltage')] };
    const violations = getThresholdViolations(data);
    expect(violations).toHaveLength(1);
    expect(violations[0].signalName).toBe('Voltage');
  });

  it('detects multiple violations, ignores in-range signals', () => {
    const data = {
      cleanedSignals: [
        makeSignal(60, 0, 50, 'Current'),
        makeSignal(-1, 0, 50, 'Voltage'),
        makeSignal(25, 0, 50, 'Temp'),
      ],
    };
    expect(getThresholdViolations(data)).toHaveLength(2);
  });

  it('does not flag signal exactly on min boundary', () => {
    expect(getThresholdViolations({ cleanedSignals: [makeSignal(0, 0, 50)] })).toEqual([]);
  });

  it('does not flag signal exactly on max boundary', () => {
    expect(getThresholdViolations({ cleanedSignals: [makeSignal(50, 0, 50)] })).toEqual([]);
  });
});

// ─── getDataForLLM ────────────────────────────────────────────────────────────

describe('getDataForLLM', () => {
  it('returns empty assets for empty array', () => {
    expect(getDataForLLM([])).toEqual({ assets: {} });
  });

  it('returns empty assets for null', () => {
    expect(getDataForLLM(null)).toEqual({ assets: {} });
  });

  it('groups signals by assetName', () => {
    const flat = [
      { assetName: 'Pump-01', signalName: 'Current', value: 25, timeIstIso: '2024-06-01T10:30:00.000Z', minThreshold: 0, maxThreshold: 50 },
      { assetName: 'Pump-01', signalName: 'Voltage', value: 22, timeIstIso: '2024-06-01T10:30:00.000Z', minThreshold: 18, maxThreshold: 26 },
    ];
    const result = getDataForLLM(flat);
    expect(result.assets).toHaveProperty('Pump-01');
    expect(result.assets['Pump-01'].signals).toHaveProperty('Current');
    expect(result.assets['Pump-01'].signals).toHaveProperty('Voltage');
  });

  it('calculates aggregated min/max/avg per signal', () => {
    const flat = [
      { assetName: 'Motor', signalName: 'RPM', value: 100, timeIstIso: '2024-06-01T10:00:00.000Z' },
      { assetName: 'Motor', signalName: 'RPM', value: 300, timeIstIso: '2024-06-01T10:01:00.000Z' },
      { assetName: 'Motor', signalName: 'RPM', value: 500, timeIstIso: '2024-06-01T10:02:00.000Z' },
    ];
    const result = getDataForLLM(flat);
    const agg = result.assets['Motor'].signals['RPM'].aggregated[0];
    expect(agg.min).toBe(100);
    expect(agg.max).toBe(500);
    expect(agg.average).toBe(300);
  });

  it('deduplicates identical time+value entries', () => {
    const row = { assetName: 'Motor', signalName: 'RPM', value: 200, timeIstIso: '2024-06-01T10:00:00.000Z' };
    const result = getDataForLLM([row, row, row]);
    expect(result.assets['Motor'].signals['RPM'].values).toHaveLength(1);
  });

  it('handles multiple assets independently', () => {
    const flat = [
      { assetName: 'Pump-01', signalName: 'Current', value: 25, timeIstIso: '2024-06-01T10:00:00.000Z' },
      { assetName: 'Motor-02', signalName: 'Vibration', value: 3, timeIstIso: '2024-06-01T10:00:00.000Z' },
    ];
    const result = getDataForLLM(flat);
    expect(Object.keys(result.assets)).toHaveLength(2);
  });
});