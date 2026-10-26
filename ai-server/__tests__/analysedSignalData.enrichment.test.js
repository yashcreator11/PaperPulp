import { jest, describe, it, expect, beforeEach } from '@jest/globals';

await jest.unstable_mockModule('dotenv/config', () => ({}));

const mockSqlConnect = jest.fn();
const mockClose = jest.fn();
const mockQuery = jest.fn();

await jest.unstable_mockModule('mssql', () => ({
  default: {
    connect: mockSqlConnect,
  },
}));

await jest.unstable_mockModule('../utils/utils.js', () => ({
  sqlConfig: { user: 'test', password: 'test', database: 'testdb', server: 'localhost' },
  extractSignalValues: jest.fn(),
  buildObservations: jest.fn(),
  correlateSignals: jest.fn(),
  ensureCollection: jest.fn(),
}));

const { enrichSignalData2 } = await import('../services/analysedSignalData.js');

describe('enrichSignalData2', () => {
  beforeEach(() => {
    mockSqlConnect.mockReset();
    mockQuery.mockReset();
    mockClose.mockReset();
  });

  it('returns empty array for null input', async () => {
    const result = await enrichSignalData2(null);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty array input', async () => {
    const result = await enrichSignalData2([]);
    expect(result).toEqual([]);
  });

  it('enriches signal data with asset name from SQL', async () => {
    mockQuery.mockResolvedValue({
      recordset: [{ AssetId: 'asset-001', AssetName: 'Pump-01' }]
    });
    mockSqlConnect.mockResolvedValue({
      request: () => ({ query: mockQuery }),
      close: mockClose,
    });

    const input = [
      { assetId: 'asset-001', signalName: 'Current', value: 30, timeMs: 1000, signalTypeId: 'sig-1' },
    ];
    const result = await enrichSignalData2(input);
    expect(result[0].assetName).toBe('Pump-01');
    expect(result[0].signalName).toBe('Current');
  });

  it('uses Unknown Asset when assetId not in SQL result', async () => {
    mockQuery.mockResolvedValue({ recordset: [] });
    mockSqlConnect.mockResolvedValue({
      request: () => ({ query: mockQuery }),
      close: mockClose,
    });

    const input = [
      { assetId: 'unknown-id', signalName: 'Voltage', value: 22, timeMs: 2000, signalTypeId: 'sig-2' }
    ];
    const result = await enrichSignalData2(input);
    expect(result[0].assetName).toBe('Unknown Asset');
  });

  it('sorts results by timeMs ascending', async () => {
    mockQuery.mockResolvedValue({ recordset: [] });
    mockSqlConnect.mockResolvedValue({
      request: () => ({ query: mockQuery }),
      close: mockClose,
    });

    const input = [
      { assetId: 'a1', signalName: 'RPM', value: 300, timeMs: 3000, signalTypeId: 's1' },
      { assetId: 'a1', signalName: 'RPM', value: 200, timeMs: 1000, signalTypeId: 's1' },
      { assetId: 'a1', signalName: 'RPM', value: 250, timeMs: 2000, signalTypeId: 's1' },
    ];
    const result = await enrichSignalData2(input);
    expect(result[0].timeMs).toBe(1000);
    expect(result[1].timeMs).toBe(2000);
    expect(result[2].timeMs).toBe(3000);
  });

  it('returns as-is when row count is within maxRows', async () => {
    mockQuery.mockResolvedValue({ recordset: [] });
    mockSqlConnect.mockResolvedValue({
      request: () => ({ query: mockQuery }),
      close: mockClose,
    });

    const input = Array.from({ length: 5 }, (_, i) => ({
      assetId: 'a1', signalName: 'Current', value: i * 10, timeMs: i * 1000, signalTypeId: 's1'
    }));
    const result = await enrichSignalData2(input, 100);
    expect(result).toHaveLength(5);
  });

  it('aggregates when row count exceeds maxRows', async () => {
    mockQuery.mockResolvedValue({ recordset: [] });
    mockSqlConnect.mockResolvedValue({
      request: () => ({ query: mockQuery }),
      close: mockClose,
    });

    const input = Array.from({ length: 200 }, (_, i) => ({
      assetId: 'a1', signalName: 'Temperature', value: 20 + i, timeMs: i * 1000, signalTypeId: 's1'
    }));
    const result = await enrichSignalData2(input, 10);
    expect(result.length).toBeLessThan(200);
  });

  it('closes the SQL pool after query', async () => {
    mockQuery.mockResolvedValue({ recordset: [] });
    mockSqlConnect.mockResolvedValue({
      request: () => ({ query: mockQuery }),
      close: mockClose,
    });

    await enrichSignalData2([{ assetId: 'a1', signalName: 'RPM', value: 100, timeMs: 1000, signalTypeId: 's1' }]);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
