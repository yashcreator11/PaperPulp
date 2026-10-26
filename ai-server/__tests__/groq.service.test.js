import { jest, describe, it, expect, beforeEach } from '@jest/globals';

await jest.unstable_mockModule('dotenv/config', () => ({}));

const mockFetch = jest.fn();
await jest.unstable_mockModule('node-fetch', () => ({ default: mockFetch }));

const { default: groqService } = await import('../services/groq.service.js');

describe('groq.service — chatWithGroq', () => {
  beforeEach(() => mockFetch.mockReset());

  it('throws if prompt is not a string', async () => {
    await expect(groqService.chatWithGroq(null)).rejects.toThrow('prompt must be a non-empty string');
    await expect(groqService.chatWithGroq(42)).rejects.toThrow('prompt must be a non-empty string');
    await expect(groqService.chatWithGroq('')).rejects.toThrow('prompt must be a non-empty string');
  });

  it('returns parsed JSON on success without system prompt', async () => {
    const mockResp = { choices: [{ message: { content: 'Hello' } }] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResp),
    });
    const result = await groqService.chatWithGroq('test prompt');
    expect(result).toEqual(mockResp);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('includes system message when systemPrompt is provided', async () => {
    const mockResp = { choices: [] };
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockResp) });
    await groqService.chatWithGroq('user msg', 'system instructions');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'system instructions' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'user msg' });
  });

  it('does not include system message when systemPrompt is null', async () => {
    const mockResp = { choices: [] };
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockResp) });
    await groqService.chatWithGroq('user msg', null);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  it('passes temperature and max_tokens when provided in opts', async () => {
    const mockResp = { choices: [] };
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockResp) });
    await groqService.chatWithGroq('prompt', null, { temperature: 0.7, max_tokens: 500 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(500);
  });

  it('throws an error when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: jest.fn().mockResolvedValue('Invalid API key'),
    });
    await expect(groqService.chatWithGroq('prompt')).rejects.toThrow('Groq chat error: 401 Unauthorized');
  });

  it('sets Authorization header with Bearer token', async () => {
    const mockResp = { choices: [] };
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockResp) });
    await groqService.chatWithGroq('prompt');
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toMatch(/^Bearer /);
  });
});
