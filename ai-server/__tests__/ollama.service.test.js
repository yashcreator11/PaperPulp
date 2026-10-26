import { jest, describe, it, expect, beforeEach } from '@jest/globals';

await jest.unstable_mockModule('../config/ollama.config.js', () => ({
  OLLAMA_BASE: 'http://localhost:11434',
  OLLAMA_MODEL: 'llama3',
  REQUEST_TIMEOUT_MS: 5000,
}));

await jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const { default: ollamaService } = await import('../services/ollama.service.js');

describe('ollama.service — chat', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns parsed JSON on successful chat', async () => {
    const mockResp = { message: { content: 'Hello from Ollama' } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResp),
    });
    const result = await ollamaService.chat('Hello');
    expect(result).toEqual(mockResp);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('includes system message when systemPrompt provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    await ollamaService.chat('user message', 'system instructions');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'system instructions' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'user message' });
  });

  it('only sends user message when no system prompt', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    await ollamaService.chat('just user');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  it('throws with status info on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: jest.fn().mockResolvedValue('down'),
    });
    await expect(ollamaService.chat('hi')).rejects.toThrow('Ollama chat error: 503');
  });

  it('uses custom model from opts', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    await ollamaService.chat('test', null, { model: 'mistral' });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('mistral');
  });

  it('times out when fetch hangs beyond REQUEST_TIMEOUT_MS', async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    // Import with short timeout
    await expect(ollamaService.chat('hang')).rejects.toThrow('request timeout');
  }, 10000);
});

describe('ollama.service — embed', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns parsed JSON on successful embed', async () => {
    const mockResp = { embedding: [0.1, 0.2, 0.3] };
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockResp) });
    const result = await ollamaService.embed('some text');
    expect(result).toEqual(mockResp);
  });

  it('throws on non-ok embed response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue('error'),
    });
    await expect(ollamaService.embed('text')).rejects.toThrow('Ollama embed error: 500');
  });

  it('passes text and model in request body', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    await ollamaService.embed('hello world', { model: 'nomic' });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input).toBe('hello world');
    expect(body.model).toBe('nomic');
  });
});
