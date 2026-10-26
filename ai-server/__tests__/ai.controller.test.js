import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mocks ──
await jest.unstable_mockModule('dotenv/config', () => ({}));

const mockEmbedText = jest.fn();
await jest.unstable_mockModule('../vectorDB/embedding.js', () => ({
  embedText: mockEmbedText,
}));

const mockUpsert = jest.fn();
await jest.unstable_mockModule('../vectorDB/qdrantClient.js', () => ({
  COLLECTION: 'test-rca',
  qdrant: { upsert: mockUpsert },
}));

const mockValidate = jest.fn();
await jest.unstable_mockModule('../services/queryValidator.service.js', () => ({
  validateAndResolveLLMFirst: mockValidate,
}));

const mockHandleUserQuery = jest.fn();
await jest.unstable_mockModule('../services/telemetryTool.js', () => ({
  handleUserQueryWithLangGraph: mockHandleUserQuery,
}));

const mockGetThresholdViolations = jest.fn();
const mockEnrichSignalData2 = jest.fn();
const mockGetDataForLLM = jest.fn();
await jest.unstable_mockModule('../services/analysedSignalData.js', () => ({
  getThresholdViolations: mockGetThresholdViolations,
  enrichSignalData2: mockEnrichSignalData2,
  getDataForLLM: mockGetDataForLLM,
}));

const mockRcaGraph = { invoke: jest.fn() };
await jest.unstable_mockModule('../services/rca.graph.js', () => ({
  rcaGraph: mockRcaGraph,
}));

const mockMammoth = { extractRawText: jest.fn() };
await jest.unstable_mockModule('mammoth', () => ({ default: mockMammoth }));

await jest.unstable_mockModule('uuid', () => ({ v4: () => 'test-uuid-1234' }));
await jest.unstable_mockModule('fs', () => ({ default: {} }));

const { ask, extractTextFromWord, uploadRcaWord } =
  await import('../controllers/ai.controller.js');

// helpers
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ─── extractTextFromWord ──────────────────────────────────────────────────────

describe('extractTextFromWord', () => {
  beforeEach(() => mockMammoth.extractRawText.mockReset());

  it('returns trimmed text from a .docx file', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: '  Hello world  ' });
    const result = await extractTextFromWord('/tmp/test.docx');
    expect(result).toBe('Hello world');
  });

  it('returns empty string for empty document', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: '   ' });
    const result = await extractTextFromWord('/tmp/empty.docx');
    expect(result).toBe('');
  });
});

// ─── uploadRcaWord ────────────────────────────────────────────────────────────

describe('uploadRcaWord', () => {
  beforeEach(() => {
    mockMammoth.extractRawText.mockReset();
    mockEmbedText.mockReset();
    mockUpsert.mockReset();
  });

  it('returns 400 if no file uploaded', async () => {
    const req = { file: null };
    const res = mockRes();
    await uploadRcaWord(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'No file uploaded' }));
  });

  it('returns 400 if file is not .docx', async () => {
    const req = { file: { originalname: 'report.pdf', path: '/tmp/report.pdf' } };
    const res = mockRes();
    await uploadRcaWord(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Only .docx files are supported' })
    );
  });

  it('returns 400 if document text is too short', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: 'short' });
    const req = { file: { originalname: 'test.docx', path: '/tmp/test.docx' } };
    const res = mockRes();
    await uploadRcaWord(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'No readable text found' })
    );
  });

  it('returns 400 if no valid chunks after splitting', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: 'x'.repeat(100) }); // no "RCA REPORT" marker, chunks filtered
    mockEmbedText.mockResolvedValue(null);
    const req = { file: { originalname: 'test.docx', path: '/tmp/test.docx' } };
    const res = mockRes();
    await uploadRcaWord(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('upserts to qdrant and returns success for valid .docx', async () => {
    const bigChunk = 'RCA REPORT\n' + 'A'.repeat(200);
    mockMammoth.extractRawText.mockResolvedValue({ value: bigChunk });
    mockEmbedText.mockResolvedValue([0.1, 0.2, 0.3]);
    mockUpsert.mockResolvedValue({});

    const req = { file: { originalname: 'report.docx', path: '/tmp/report.docx' } };
    const res = mockRes();
    await uploadRcaWord(req, res);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns 500 on unexpected error', async () => {
    mockMammoth.extractRawText.mockRejectedValue(new Error('Read error'));
    const req = { file: { originalname: 'report.docx', path: '/tmp/report.docx' } };
    const res = mockRes();
    await uploadRcaWord(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Word ingestion failed' }));
  });
});

// ─── ask ──────────────────────────────────────────────────────────────────────

describe('ask', () => {
  beforeEach(() => {
    mockValidate.mockReset();
    mockHandleUserQuery.mockReset();
    mockGetThresholdViolations.mockReset();
    mockEnrichSignalData2.mockReset();
    mockGetDataForLLM.mockReset();
    mockRcaGraph.invoke.mockReset();
  });

  it('returns 200 with success:false when validation fails', async () => {
    mockValidate.mockResolvedValue({ valid: false, message: 'Asset not found' });
    const req = { body: { prompt: 'bad query', sessionId: 's1' } };
    const res = mockRes();
    await ask(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns no anomalies message when threshold violations are empty', async () => {
    mockValidate.mockResolvedValue({ valid: true, message: 'Requesting Engine 2...' });
    mockHandleUserQuery.mockResolvedValue({ cleanedSignals: [] });
    mockGetThresholdViolations.mockReturnValue([]);
    const req = { body: { prompt: 'show engine2 24h', sessionId: 's1' } };
    const res = mockRes();
    await ask(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.stringContaining('No anomalies') })
    );
  });

  it('invokes rcaGraph and returns rca on violations found', async () => {
    mockValidate.mockResolvedValue({ valid: true, message: 'ok' });
    mockHandleUserQuery.mockResolvedValue({ cleanedSignals: [{ value: 100 }], userQuery: 'q' });
    mockGetThresholdViolations.mockReturnValue([{ signalName: 'Current', value: 100 }]);
    mockEnrichSignalData2.mockResolvedValue([{ assetName: 'Pump-01', signalName: 'Current', value: 100 }]);
    mockGetDataForLLM.mockReturnValue({ assets: { 'Pump-01': { signals: {} } } });
    mockRcaGraph.invoke.mockResolvedValue({ finalRCA: 'Overload detected.' });

    const req = { body: { prompt: 'show pump01', sessionId: 's2' } };
    const res = mockRes();
    await ask(req, res);

    expect(mockRcaGraph.invoke).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, rca: 'Overload detected.' })
    );
  });

  it('returns 500 on unexpected error', async () => {
    mockValidate.mockRejectedValue(new Error('Unexpected crash'));
    const req = { body: { prompt: 'crash query', sessionId: 's3' } };
    const res = mockRes();
    await ask(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'RCA generation failed' })
    );
  });
});
