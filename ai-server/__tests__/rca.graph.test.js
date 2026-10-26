import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockBuildObservations = jest.fn();
const mockCorrelateSignals = jest.fn();
const mockSearchHistoricalRCA = jest.fn();
const mockGenerateRCAWithLLM = jest.fn();

await jest.unstable_mockModule('../utils/utils.js', () => ({
  buildObservations: mockBuildObservations,
  correlateSignals: mockCorrelateSignals,
  searchHistoricalRCA: mockSearchHistoricalRCA,
}));

await jest.unstable_mockModule('../services/GroqLLMService.js', () => ({
  generateRCAWithLLM: mockGenerateRCAWithLLM,
}));

const { rcaGraph } = await import('../services/rca.graph.js');

describe('rcaGraph', () => {
  const makeInput = (assetName = 'Pump-01') => ({
    userQuery: 'analyze ' + assetName,
    input: {
      assets: {
        [assetName]: {
          signals: {
            Current: { values: [{ value: 75 }], maxThreshold: 50, minThreshold: 0, aggregated: [] }
          }
        }
      }
    }
  });

  beforeEach(() => {
    mockBuildObservations.mockReset();
    mockCorrelateSignals.mockReset();
    mockSearchHistoricalRCA.mockReset();
    mockGenerateRCAWithLLM.mockReset();
  });

  it('runs the full graph and returns finalRCA', async () => {
    mockBuildObservations.mockReturnValue({
      observations: ['Current exceeded max threshold (75)'],
      flags: ['Current_HIGH'],
    });
    mockCorrelateSignals.mockReturnValue([
      { cause: 'Mechanical overload', confidence: 0.8, matchedSignals: ['Current_HIGH', 'RPM_LOW'] }
    ]);
    mockSearchHistoricalRCA.mockResolvedValue({
      cause: 'Overload',
      recommendedActions: ['Inspect load'],
      similarity: 0.9,
      occurredOn: '2025-01-01',
    });
    mockGenerateRCAWithLLM.mockResolvedValue('1. Overload detected. 2. High current. 3. Motor at risk. 4. Reduce load.');

    const result = await rcaGraph.invoke(makeInput());

    expect(result.finalRCA).toBe('1. Overload detected. 2. High current. 3. Motor at risk. 4. Reduce load.');
    expect(mockBuildObservations).toHaveBeenCalledTimes(1);
    expect(mockCorrelateSignals).toHaveBeenCalledWith(['Current_HIGH']);
    expect(mockSearchHistoricalRCA).toHaveBeenCalledTimes(1);
    expect(mockGenerateRCAWithLLM).toHaveBeenCalledTimes(1);
  });

  it('passes observations flags to correlateSignals', async () => {
    mockBuildObservations.mockReturnValue({ observations: [], flags: ['Vibration_HIGH', 'Temperature_HIGH'] });
    mockCorrelateSignals.mockReturnValue([]);
    mockSearchHistoricalRCA.mockResolvedValue({ recommendedActions: [] });
    mockGenerateRCAWithLLM.mockResolvedValue('No issues.');

    await rcaGraph.invoke(makeInput());

    expect(mockCorrelateSignals).toHaveBeenCalledWith(['Vibration_HIGH', 'Temperature_HIGH']);
  });

  it('handles empty observations gracefully', async () => {
    mockBuildObservations.mockReturnValue({ observations: [], flags: [] });
    mockCorrelateSignals.mockReturnValue([]);
    mockSearchHistoricalRCA.mockResolvedValue({ recommendedActions: [] });
    mockGenerateRCAWithLLM.mockResolvedValue('All normal.');

    const result = await rcaGraph.invoke(makeInput());
    expect(result.finalRCA).toBe('All normal.');
  });

  it('calls searchHistoricalRCA with joined observation strings', async () => {
    const obs = ['Current spike detected', 'Vibration high'];
    mockBuildObservations.mockReturnValue({ observations: obs, flags: [] });
    mockCorrelateSignals.mockReturnValue([]);
    mockSearchHistoricalRCA.mockResolvedValue({ recommendedActions: [] });
    mockGenerateRCAWithLLM.mockResolvedValue('result');

    await rcaGraph.invoke(makeInput());

    expect(mockSearchHistoricalRCA).toHaveBeenCalledWith(obs.join(' '));
  });
});
