import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockChatWithGroq = jest.fn();
await jest.unstable_mockModule('../services/groq.service.js', () => ({
  default: { chatWithGroq: mockChatWithGroq },
}));

const { generateRCAWithLLM } = await import('../services/GroqLLMService.js');

describe('generateRCAWithLLM', () => {
  beforeEach(() => mockChatWithGroq.mockReset());

  const makeState = (assetName = 'Pump-01') => ({
    userQuery: 'what happened to ' + assetName,
    input: {
      assets: {
        [assetName]: { signals: {} }
      }
    },
    observations: {
      observations: ['Current exceeded max threshold (75)', 'Vibration negative value detected (-1)'],
      flags: ['Current_HIGH', 'Vibration_NEGATIVE'],
    },
    correlations: [
      { cause: 'Mechanical overload', confidence: 0.8 },
    ],
    historyMatches: {
      recommendedActions: ['Inspect motor load', 'Check shaft alignment'],
    },
  });

  it('returns LLM content when successful', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: '1. What happened: Current spike...' } }],
    });
    const result = await generateRCAWithLLM(makeState());
    expect(result).toBe('1. What happened: Current spike...');
    expect(mockChatWithGroq).toHaveBeenCalledTimes(1);
  });

  it('returns fallback message when LLM returns empty content', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    });
    const result = await generateRCAWithLLM(makeState());
    expect(result).toBe('RCA explanation could not be generated.');
  });

  it('returns fallback when choices is empty array', async () => {
    mockChatWithGroq.mockResolvedValue({ choices: [] });
    const result = await generateRCAWithLLM(makeState());
    expect(result).toBe('RCA explanation could not be generated.');
  });

  it('includes asset name in the call context', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: 'RCA result' } }],
    });
    await generateRCAWithLLM(makeState('Motor-99'));
    const callArgs = mockChatWithGroq.mock.calls[0];
    // systemPrompt and userPrompt both passed
    expect(callArgs[0]).toContain('industrial Root Cause Analysis');
  });

  it('propagates errors from groqService', async () => {
    mockChatWithGroq.mockRejectedValue(new Error('API unavailable'));
    await expect(generateRCAWithLLM(makeState())).rejects.toThrow('API unavailable');
  });

  it('handles state with no correlations gracefully', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: 'No issues found.' } }],
    });
    const state = makeState();
    state.correlations = [];
    const result = await generateRCAWithLLM(state);
    expect(result).toBe('No issues found.');
  });

  it('handles state with no recommendedActions gracefully', async () => {
    mockChatWithGroq.mockResolvedValue({
      choices: [{ message: { content: 'OK' } }],
    });
    const state = makeState();
    state.historyMatches = { recommendedActions: [] };
    const result = await generateRCAWithLLM(state);
    expect(result).toBe('OK');
  });
});
