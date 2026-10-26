import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mocks ──
await jest.unstable_mockModule('dotenv/config', () => ({}));

await jest.unstable_mockModule('mssql', () => ({
  default: {
    connect: jest.fn(),
    close: jest.fn(),
    NVarChar: jest.fn(() => 'NVarChar'),
  },
  NVarChar: jest.fn(() => 'NVarChar'),
}));

const mockChatWithGroq = jest.fn();

await jest.unstable_mockModule('../services/groq.service.js', () => ({
  default: { chatWithGroq: mockChatWithGroq },
  chatWithGroq: mockChatWithGroq,
}));

await jest.unstable_mockModule('../utils/utils.js', () => ({
  sqlConfig: { user: 'test', password: 'test', database: 'testdb', server: 'localhost' },
}));

const { validateAndResolveLLMFirst } =
  await import('../services/queryValidator.service.js');

// ─── validateAndResolveLLMFirst — input validation ───────────────────────────

describe('validateAndResolveLLMFirst — input validation', () => {
  it('returns invalid for null input', async () => {
    const result = await validateAndResolveLLMFirst(null);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('empty_query');
  });

  it('returns invalid for empty string', async () => {
    const result = await validateAndResolveLLMFirst('');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('empty_query');
  });

  it('returns invalid for non-string input', async () => {
    const result = await validateAndResolveLLMFirst(123);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('empty_query');
  });

  it('returns a message string for invalid input', async () => {
    const result = await validateAndResolveLLMFirst(null);
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// ─── validateAndResolveLLMFirst — LLM extraction failure ─────────────────────

describe('validateAndResolveLLMFirst — LLM failure handling', () => {
  beforeEach(() => {
    mockChatWithGroq.mockReset();
  });

  it('returns llm_error when chatWithGroq throws', async () => {
    mockChatWithGroq.mockRejectedValue(new Error('Network error'));
    const result = await validateAndResolveLLMFirst('show engine 2 for 24h');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('llm_error');
  });

  it('returns llm_error when LLM returns no JSON', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: 'Sorry I cannot help.', tool_calls: [] } }],
    });
    const result = await validateAndResolveLLMFirst('show engine 2 for 24h');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('llm_error');
  });

  it('returns missing_asset when LLM returns null asset', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: '{"asset":null,"time":"24 hours"}', tool_calls: [] } }],
    });
    const result = await validateAndResolveLLMFirst('what happened yesterday?');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_asset');
  });
});

// ─── validateAndResolveLLMFirst — SQL asset not found ────────────────────────

describe('validateAndResolveLLMFirst — asset resolution', () => {
  beforeEach(() => {
    mockChatWithGroq.mockReset();
  });

  it('returns asset_not_found when SQL returns no records', async () => {
    // LLM returns valid extraction
    mockChatWithGroq.mockResolvedValue({
      choices: [
        { message: { content: '{"asset":"engine99","time":"last 24 hours"}', tool_calls: [] } },
      ],
    });

    // SQL pool mock returns empty recordset
    const mssql = (await import('mssql')).default;
    const mockRequest = { input: jest.fn(), query: jest.fn().mockResolvedValue({ recordset: [] }) };
    mssql.connect.mockResolvedValue({
      request: () => mockRequest,
      close: jest.fn(),
    });

    const result = await validateAndResolveLLMFirst('show engine99 for 24 hours');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('asset_not_found');
  });

  it('returns valid result when asset is found', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [
        { message: { content: '{"asset":"engine2","time":"last 24 hours"}', tool_calls: [] } },
      ],
    });

    const mssql = (await import('mssql')).default;
    const mockRequest = {
      input: jest.fn(),
      query: jest.fn().mockResolvedValue({
        recordset: [{ AssetId: 'abc-123', Name: 'Engine 2' }],
      }),
    };
    mssql.connect.mockResolvedValue({
      request: () => mockRequest,
      close: jest.fn(),
    });

    const result = await validateAndResolveLLMFirst('show engine2 for 24 hours');
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('ok');
    expect(result.asset.name).toBe('Engine 2');
    expect(result.asset.assetId).toBe('abc-123');
  });

  it('valid result includes a parsed timeWindow with from/to', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [
        { message: { content: '{"asset":"pump1","time":"last 1 hour"}', tool_calls: [] } },
      ],
    });

    const mssql = (await import('mssql')).default;
    const mockRequest = {
      input: jest.fn(),
      query: jest.fn().mockResolvedValue({
        recordset: [{ AssetId: 'p-001', Name: 'Pump 1' }],
      }),
    };
    mssql.connect.mockResolvedValue({
      request: () => mockRequest,
      close: jest.fn(),
    });

    const result = await validateAndResolveLLMFirst('show pump1 for last 1 hour');
    expect(result.valid).toBe(true);
    expect(result.timeWindow).toHaveProperty('raw');
    expect(result.timeWindow).toHaveProperty('parsed');
    expect(result.timeWindow.parsed).toHaveProperty('from');
    expect(result.timeWindow.parsed).toHaveProperty('to');
  });

  it('returns sql_error when SQL throws', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [
        { message: { content: '{"asset":"pump1","time":"last 1 hour"}', tool_calls: [] } },
      ],
    });

    const mssql = (await import('mssql')).default;
    mssql.connect.mockRejectedValue(new Error('SQL connection refused'));

    const result = await validateAndResolveLLMFirst('show pump1 for last 1 hour');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('sql_error');
  });
});
