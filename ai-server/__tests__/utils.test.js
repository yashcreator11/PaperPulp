import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mocks must come before any import of the module under test ──
await jest.unstable_mockModule('dotenv/config', () => ({}));

await jest.unstable_mockModule('../coRelationalRules.js', () => ({
  CORRELATION_RULES: [
    {
      id: 'MECHANICAL_OVERLOAD',
      when: ['Current_HIGH', 'RPM_LOW'],
      cause: 'Mechanical overload, jammed shaft, or excessive load',
      confidence: 0.8,
    },
    {
      id: 'BEARING_FAILURE',
      when: ['Vibration_HIGH', 'Temperature_HIGH'],
      cause: 'Bearing wear or lubrication failure',
      confidence: 0.85,
    },
    {
      id: 'CURRENT_SENSOR_FAULT',
      when: ['Current_NEGATIVE'],
      cause: 'Faulty current sensor',
      confidence: 0.9,
    },
  ],
}));

await jest.unstable_mockModule('../vectorDB/embedding.js', () => ({
  embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

await jest.unstable_mockModule('../vectorDB/qdrantClient.js', () => ({
  COLLECTION: 'test-collection',
  qdrant: {
    search: jest.fn(),
    getCollections: jest.fn(),
    createCollection: jest.fn(),
  },
}));

const { buildObservations, correlateSignals, extractSignalValues, sqlConfig } =
  await import('../utils/utils.js');

// ─── buildObservations ────────────────────────────────────────────────────────

describe('buildObservations', () => {
  const makeAsset = (signals) => ({ signals });

  it('returns empty observations for asset with no signals', () => {
    const result = buildObservations(makeAsset({}));
    expect(result.observations).toEqual([]);
    expect(result.flags).toEqual([]);
  });

  it('returns empty observations when signal has no values', () => {
    const asset = makeAsset({
      Current: { values: [], maxThreshold: 50, minThreshold: 0, aggregated: [] },
    });
    const result = buildObservations(asset);
    expect(result.observations).toEqual([]);
    expect(result.flags).toEqual([]);
  });

  it('flags signal exceeding max threshold', () => {
    const asset = makeAsset({
      Current: {
        values: [{ value: 75 }],
        maxThreshold: 50,
        minThreshold: 0,
        aggregated: [],
      },
    });
    const result = buildObservations(asset);
    expect(result.observations.some(o => o.includes('Current exceeded max'))).toBe(true);
    expect(result.flags).toContain('Current_HIGH');
  });

  it('flags signal below min threshold', () => {
    const asset = makeAsset({
      Voltage: {
        values: [{ value: -5 }],
        maxThreshold: 26,
        minThreshold: 0,
        aggregated: [],
      },
    });
    const result = buildObservations(asset);
    expect(result.observations.some(o => o.includes('Voltage dropped below'))).toBe(true);
    expect(result.flags).toContain('Voltage_LOW');
  });

  it('flags negative value with NEGATIVE flag', () => {
    const asset = makeAsset({
      Current: {
        values: [{ value: -10 }],
        maxThreshold: 50,
        minThreshold: 0,
        aggregated: [],
      },
    });
    const result = buildObservations(asset);
    expect(result.flags).toContain('Current_NEGATIVE');
    expect(result.observations.some(o => o.includes('negative value'))).toBe(true);
  });

  it('flags FLUCTUATING when max - min exceeds 60% of maxThreshold', () => {
    const asset = makeAsset({
      Voltage: {
        values: [{ value: 20 }],
        maxThreshold: 26,
        minThreshold: 0,
        aggregated: [{ min: 1, max: 25 }], // 24 > 26*0.6=15.6
      },
    });
    const result = buildObservations(asset);
    expect(result.flags).toContain('Voltage_FLUCTUATING');
  });

  it('does not add duplicate flags for repeated violation values', () => {
    const asset = makeAsset({
      RPM: {
        values: [{ value: 700 }, { value: 750 }],
        maxThreshold: 600,
        minThreshold: 100,
        aggregated: [],
      },
    });
    const result = buildObservations(asset);
    // Set deduplication: RPM_HIGH should appear once as a flag
    expect(result.flags.filter(f => f === 'RPM_HIGH')).toHaveLength(1);
  });

  it('handles multiple signals independently', () => {
    const asset = makeAsset({
      Current: { values: [{ value: 60 }], maxThreshold: 50, minThreshold: 0, aggregated: [] },
      Vibration: { values: [{ value: -1 }], maxThreshold: 10, minThreshold: 0, aggregated: [] },
    });
    const result = buildObservations(asset);
    expect(result.flags).toContain('Current_HIGH');
    expect(result.flags).toContain('Vibration_NEGATIVE');
  });
});

// ─── correlateSignals ─────────────────────────────────────────────────────────

describe('correlateSignals', () => {
  it('returns empty array when no flags match any rule', () => {
    expect(correlateSignals([])).toEqual([]);
    expect(correlateSignals(['FlowRate_LOW'])).toEqual([]);
  });

  it('matches MECHANICAL_OVERLOAD when Current_HIGH and RPM_LOW are both present', () => {
    const results = correlateSignals(['Current_HIGH', 'RPM_LOW']);
    expect(results).toHaveLength(1);
    expect(results[0].cause).toMatch(/mechanical overload/i);
    expect(results[0].confidence).toBe(0.8);
    expect(results[0].matchedSignals).toEqual(['Current_HIGH', 'RPM_LOW']);
  });

  it('matches BEARING_FAILURE on Vibration_HIGH + Temperature_HIGH', () => {
    const results = correlateSignals(['Vibration_HIGH', 'Temperature_HIGH']);
    expect(results.some(r => r.cause.toLowerCase().includes('bearing'))).toBe(true);
  });

  it('matches CURRENT_SENSOR_FAULT on Current_NEGATIVE alone', () => {
    const results = correlateSignals(['Current_NEGATIVE']);
    expect(results.some(r => r.cause.toLowerCase().includes('sensor'))).toBe(true);
  });

  it('can match multiple rules when multiple flag sets are satisfied', () => {
    // Both MECHANICAL_OVERLOAD and BEARING_FAILURE
    const flags = ['Current_HIGH', 'RPM_LOW', 'Vibration_HIGH', 'Temperature_HIGH'];
    const results = correlateSignals(flags);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('does not match a rule if only part of the when conditions are present', () => {
    // MECHANICAL_OVERLOAD needs both Current_HIGH AND RPM_LOW
    const results = correlateSignals(['Current_HIGH']); // only one of the two
    expect(results.find(r => r.cause.includes('overload'))).toBeUndefined();
  });

  it('result objects include cause, confidence, and matchedSignals', () => {
    const results = correlateSignals(['Current_HIGH', 'RPM_LOW']);
    expect(results[0]).toHaveProperty('cause');
    expect(results[0]).toHaveProperty('confidence');
    expect(results[0]).toHaveProperty('matchedSignals');
  });
});

// ─── extractSignalValues ──────────────────────────────────────────────────────

const makeTableBlock = (rows, columns) => ({
  tableMeta: { columns: columns.map((label, index) => ({ index, label })) },
  values: rows,
});

describe('extractSignalValues', () => {
  it('returns empty array for null/undefined input', () => {
    expect(extractSignalValues(null)).toEqual([]);
    expect(extractSignalValues(undefined)).toEqual([]);
  });

  it('returns empty array for empty fluxRaw array', () => {
    expect(extractSignalValues([])).toEqual([]);
    expect(extractSignalValues({ fluxRaw: [] })).toEqual([]);
    expect(extractSignalValues({ influxData: [] })).toEqual([]);
  });

  it('returns empty array for object with no recognized array shape', () => {
    expect(extractSignalValues({ something: 'else' })).toEqual([]);
  });

  it('extracts numeric signal values from a table block', () => {
    const block = makeTableBlock(
      [['asset-1', 'sig-1', 'Temperature', '2024-06-01T10:00:00Z', 'value', 45]],
      ['assetId', 'signalTypeId', 'SignalName', '_time', '_field', '_value']
    );
    const results = extractSignalValues([block]);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].value).toBe(45);
    expect(results[0].assetId).toBe('asset-1');
  });

  it('skips rows where _value is non-numeric string', () => {
    const block = makeTableBlock(
      [['asset-1', 'sig-1', 'Temperature', '2024-06-01T10:00:00Z', 'value', 'not-a-number']],
      ['assetId', 'signalTypeId', 'SignalName', '_time', '_field', '_value']
    );
    const results = extractSignalValues([block]);
    expect(results).toEqual([]);
  });

  it('accepts { influxData: [...] } shape', () => {
    const block = makeTableBlock(
      [['asset-2', 'sig-2', 'RPM', '2024-06-01T10:00:00Z', 'value', 500]],
      ['assetId', 'signalTypeId', 'SignalName', '_time', '_field', '_value']
    );
    const results = extractSignalValues({ influxData: [block] });
    expect(results.length).toBeGreaterThan(0);
  });

  it('mode=latest returns only one sample per asset/signal pair', () => {
    const block = makeTableBlock(
      [
        ['a1', 's1', 'Current', '2024-06-01T10:00:00Z', 'value', 10],
        ['a1', 's1', 'Current', '2024-06-01T11:00:00Z', 'value', 20],
      ],
      ['assetId', 'signalTypeId', 'SignalName', '_time', '_field', '_value']
    );
    const results = extractSignalValues([block], { mode: 'latest' });
    expect(results).toHaveLength(1);
    expect([10, 20]).toContain(results[0].value);
  });

  it('mode=all returns entries for same assetId|signalTypeId (dedup by timeMs key)', () => {
    const row = ['a1', 's1', 'Current', '2024-06-01T10:00:00Z', 'value', 10];
    const block = makeTableBlock(
      [row, row, row],
      ['assetId', 'signalTypeId', 'SignalName', '_time', '_field', '_value']
    );
    const results = extractSignalValues([block], { mode: 'all' });
    // All three rows share same timeMs key — implementation deduplicates to at most 3
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(r => r.assetId === 'a1')).toBe(true);
  });

  it('attaches known signal thresholds from built-in definitions', () => {
    const block = makeTableBlock(
      [['a1', 's1', 'Current', '2024-06-01T10:00:00Z', 'value', 30]],
      ['assetId', 'signalTypeId', 'SignalName', '_time', '_field', '_value']
    );
    const results = extractSignalValues([block]);
    const current = results.find(r => r.signalName === 'Current');
    expect(current).toBeDefined();
    expect(current.minThreshold).toBe(0);
    expect(current.maxThreshold).toBe(50);
    expect(current.unit).toBe('A');
  });

  it('skips table blocks with no tableMeta', () => {
    const results = extractSignalValues([{ values: [[1, 2, 3]] }]);
    expect(results).toEqual([]);
  });
});

// ─── sqlConfig ────────────────────────────────────────────────────────────────

describe('sqlConfig', () => {
  it('is exported as an object with required connection fields', () => {
    expect(sqlConfig).toHaveProperty('server');
    expect(sqlConfig).toHaveProperty('database');
    expect(sqlConfig).toHaveProperty('user');
    expect(sqlConfig).toHaveProperty('password');
    expect(sqlConfig).toHaveProperty('options');
  });

  it('has port 1433', () => {
    expect(sqlConfig.port).toBe(1433);
  });

  it('has trustServerCertificate true', () => {
    expect(sqlConfig.options.trustServerCertificate).toBe(true);
  });
});