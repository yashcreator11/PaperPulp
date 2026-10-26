import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mocks ──
await jest.unstable_mockModule('dotenv/config', () => ({}));

const mockChatWithGroq = jest.fn();
await jest.unstable_mockModule('../services/groq.service.js', () => ({
  chatWithGroq: mockChatWithGroq,
}));

const mockCollectRows = jest.fn();
await jest.unstable_mockModule('@influxdata/influxdb-client', () => ({
  InfluxDB: jest.fn().mockImplementation(() => ({
    getQueryApi: jest.fn().mockReturnValue({ collectRows: mockCollectRows }),
  })),
}));

const influxService = (await import('../services/influx.service.js')).default;

// ─── getTelemetryFromUserQuery ────────────────────────────────────────────────

describe('getTelemetryFromUserQuery', () => {
  beforeEach(() => {
    mockChatWithGroq.mockReset();
    mockCollectRows.mockReset();
  });

  it('throws when LLM validation returns no JSON', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    });
    await expect(influxService.getTelemetryFromUserQuery('get data')).rejects.toThrow();
  });

  it('throws when validation LLM says query is invalid', async () => {
    // First call: validation response — invalid
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"valid":false,"reason":"Query too broad"}' } }],
    });

    await expect(
      influxService.getTelemetryFromUserQuery('give me all data')
    ).rejects.toThrow('Query too broad');
  });

  it('throws when flux generation LLM returns no JSON', async () => {
    // First call: validation passes
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"valid":true,"reason":"ok"}' } }],
    });
    // Second call: flux generation returns garbage
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: 'no json here' } }],
    });

    await expect(
      influxService.getTelemetryFromUserQuery('get temperature of Engine2 last 7 days')
    ).rejects.toThrow('LLM did not return valid JSON');
  });

  it('throws when flux LLM returns null flux', async () => {
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"valid":true,"reason":"ok"}' } }],
    });
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"flux":null,"error":"Query too broad"}' } }],
    });

    await expect(
      influxService.getTelemetryFromUserQuery('get all data')
    ).rejects.toThrow('Query too broad');
  });

  it('executes flux query and returns data on success', async () => {
    const fakeData = [{ time: '2024-01-01T00:00:00Z', value: 42 }];

    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"valid":true,"reason":"ok"}' } }],
    });
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"flux":"from(bucket: \\"test\\") |> range(start: -7d)"}' } }],
    });
    mockCollectRows.mockResolvedValue(fakeData);

    const result = await influxService.getTelemetryFromUserQuery(
      'get temperature of Engine2 last 7 days'
    );
    expect(result).toEqual(fakeData);
    expect(mockCollectRows).toHaveBeenCalledTimes(1);
  });

  it('propagates InfluxDB errors', async () => {
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"valid":true,"reason":"ok"}' } }],
    });
    mockChatWithGroq.mockResolvedValueOnce({
      choices: [{ message: { content: '{"flux":"from(bucket: \\"test\\")"}' } }],
    });
    mockCollectRows.mockRejectedValue(new Error('InfluxDB timeout'));

    await expect(
      influxService.getTelemetryFromUserQuery('get temperature of Engine2 last 7d')
    ).rejects.toThrow('InfluxDB timeout');
  });
});
