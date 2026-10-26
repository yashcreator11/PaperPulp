import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mocks (must precede all imports of the module under test) ──

await jest.unstable_mockModule('dotenv/config', () => ({}));

// Mock LangGraph
const mockCompile = jest.fn();
const mockAddNode = jest.fn();
const mockAddEdge = jest.fn();
const mockInvoke = jest.fn();

const mockStateGraphInstance = {
  addNode: jest.fn().mockReturnThis(),
  addEdge: jest.fn().mockReturnThis(),
  compile: jest.fn().mockReturnValue({ invoke: mockInvoke }),
};

await jest.unstable_mockModule('@langchain/langgraph', () => ({
  StateGraph: jest.fn().mockImplementation(() => mockStateGraphInstance),
  START: '__start__',
  END: '__end__',
  MessagesZodMeta: {},
}));

await jest.unstable_mockModule('@langchain/langgraph/zod', () => ({
  registry: {},
}));

// Mock zod — must export both named exports and z namespace (zod v4 style)
const zodSchema = { optional: jest.fn().mockReturnThis(), _def: {} };
const makeZodMock = () => ({
  object: jest.fn().mockReturnValue(zodSchema),
  string: jest.fn().mockReturnValue(zodSchema),
  array: jest.fn().mockReturnValue(zodSchema),
  record: jest.fn().mockReturnValue(zodSchema),
  any: jest.fn().mockReturnValue(zodSchema),
  optional: jest.fn().mockReturnValue(zodSchema),
});
const zodMock = makeZodMock();
await jest.unstable_mockModule('zod', () => ({
  default: zodMock,
  z: zodMock,
  ...zodMock,
}));

// Mock groq service
const mockChatWithGroq = jest.fn();
await jest.unstable_mockModule('../services/groq.service.js', () => ({
  default: { chatWithGroq: mockChatWithGroq },
}));

// Mock utils
const mockExtractSignalValues = jest.fn();
await jest.unstable_mockModule('../utils/utils.js', () => ({
  extractSignalValues: mockExtractSignalValues,
  sqlConfig: { server: 'localhost', database: 'test' },
}));

// Mock InfluxDB
const mockIterateRows = jest.fn();
await jest.unstable_mockModule('@influxdata/influxdb-client', () => ({
  InfluxDB: jest.fn().mockImplementation(() => ({
    getQueryApi: jest.fn().mockReturnValue({ iterateRows: mockIterateRows }),
  })),
}));

// Mock mssql
const mockQuery = jest.fn();
const mockRequest = jest.fn().mockReturnValue({ query: mockQuery });
const mockClose = jest.fn();
const mockPool = { request: mockRequest, close: mockClose };
await jest.unstable_mockModule('mssql', () => ({
  default: {
    connect: jest.fn().mockResolvedValue(mockPool),
  },
}));

const { buildQueryGraph, handleUserQueryWithLangGraph } =
  await import('../services/telemetryTool.js');

// ─── buildQueryGraph ──────────────────────────────────────────────────────────

describe('buildQueryGraph', () => {
  it('returns a compiled graph agent with an invoke method', () => {
    const agent = buildQueryGraph();
    expect(agent).toBeDefined();
    expect(typeof agent.invoke).toBe('function');
  });

  it('adds all required nodes', () => {
    buildQueryGraph();
    const addNodeCalls = mockStateGraphInstance.addNode.mock.calls.map((c) => c[0]);
    expect(addNodeCalls).toContain('llmGenerate');
    expect(addNodeCalls).toContain('runSql');
    expect(addNodeCalls).toContain('runFlux');
    expect(addNodeCalls).toContain('transform');
    expect(addNodeCalls).toContain('respond');
  });

  it('connects edges in the correct order', () => {
    buildQueryGraph();
    const edgeCalls = mockStateGraphInstance.addEdge.mock.calls;
    // verify at least the critical edges exist
    const edgePairs = edgeCalls.map((c) => [c[0], c[1]]);
    expect(edgePairs).toContainEqual(['__start__', 'llmGenerate']);
    expect(edgePairs).toContainEqual(['llmGenerate', 'runSql']);
    expect(edgePairs).toContainEqual(['runSql', 'runFlux']);
    expect(edgePairs).toContainEqual(['runFlux', 'transform']);
    expect(edgePairs).toContainEqual(['transform', 'respond']);
    expect(edgePairs).toContainEqual(['respond', '__end__']);
  });
});

// ─── handleUserQueryWithLangGraph ────────────────────────────────────────────

describe('handleUserQueryWithLangGraph', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockStateGraphInstance.compile.mockReturnValue({ invoke: mockInvoke });
  });

  it('returns cleaned signals when graph produces cleaned data', async () => {
    mockInvoke.mockResolvedValue({
      userQuery: 'temperature engine2',
      cleaned: [{ signalName: 'Temperature', value: 45 }],
      error: null,
    });

    const result = await handleUserQueryWithLangGraph('temperature engine2');

    expect(result.userQuery).toBe('temperature engine2');
    expect(result.cleanedSignals).toHaveLength(1);
    expect(result.cleanedSignals[0].signalName).toBe('Temperature');
    expect(result.error).toBeNull();
    expect(result.summary.signalsCount).toBe(1);
  });

  it('returns empty cleanedSignals with error when graph has no cleaned data', async () => {
    mockInvoke.mockResolvedValue({
      userQuery: 'bad query',
      cleaned: null,
      error: 'LLM generation failed: timeout',
    });

    const result = await handleUserQueryWithLangGraph('bad query');

    expect(result.cleanedSignals).toEqual([]);
    expect(result.error).toBe('LLM generation failed: timeout');
    expect(result.summary.signalsCount).toBe(0);
  });

  it('returns fallback error when graph produces no response', async () => {
    mockInvoke.mockResolvedValue({});

    const result = await handleUserQueryWithLangGraph('empty query');

    expect(result.cleanedSignals).toEqual([]);
    expect(result.error).toBe('No response produced by graph');
    expect(result.summary.signalsCount).toBe(0);
  });

  it('returns empty array for cleaned when cleaned is an empty array', async () => {
    mockInvoke.mockResolvedValue({
      userQuery: 'pump status',
      cleaned: [],
      error: null,
    });

    const result = await handleUserQueryWithLangGraph('pump status');

    expect(result.cleanedSignals).toEqual([]);
    expect(result.summary.signalsCount).toBe(0);
    expect(result.error).toBeNull();
  });

  it('passes the userQuery as initial state to the agent', async () => {
    mockInvoke.mockResolvedValue({ cleaned: [], error: null });
    await handleUserQueryWithLangGraph('vibration analysis');
    expect(mockInvoke).toHaveBeenCalledWith({ userQuery: 'vibration analysis' });
  });
});
