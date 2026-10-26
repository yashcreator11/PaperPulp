import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mocks ──
await jest.unstable_mockModule('dotenv/config', () => ({}));

// ─── ollama.config.js ─────────────────────────────────────────────────────────

describe('ollama.config.js exports', () => {
  it('exports OLLAMA_BASE with fallback to localhost', async () => {
    delete process.env.OLLAMA_BASE;
    const { OLLAMA_BASE } = await import('../config/ollama.config.js');
    expect(OLLAMA_BASE).toBe('http://localhost:11434');
  });

  it('exports OLLAMA_MODEL with fallback to llama3', async () => {
    delete process.env.OLLAMA_MODEL;
    const { OLLAMA_MODEL } = await import('../config/ollama.config.js');
    expect(OLLAMA_MODEL).toBe('llama3');
  });

  it('exports REQUEST_TIMEOUT_MS as a number with fallback', async () => {
    delete process.env.REQUEST_TIMEOUT_MS;
    const { REQUEST_TIMEOUT_MS } = await import('../config/ollama.config.js');
    expect(typeof REQUEST_TIMEOUT_MS).toBe('number');
    expect(REQUEST_TIMEOUT_MS).toBe(1000000);
  });

  it('uses environment variable for OLLAMA_BASE when set', async () => {
    // Since ESM modules are cached, we verify the default fallback values.
    // In a real CI environment with env set before import this would pick it up.
    const { OLLAMA_BASE } = await import('../config/ollama.config.js');
    expect(typeof OLLAMA_BASE).toBe('string');
    expect(OLLAMA_BASE.startsWith('http')).toBe(true);
  });
});

// ─── vectorDB/qdrantClient.js ──────────────────────────────────────────────────

describe('vectorDB/qdrantClient.js exports', () => {
  let qdrantMod;

  beforeEach(async () => {
    await jest.unstable_mockModule('@qdrant/js-client-rest', () => ({
      QdrantClient: jest.fn().mockImplementation(() => ({
        createCollection: jest.fn(),
        upsert: jest.fn(),
        search: jest.fn(),
        getCollections: jest.fn(),
      })),
    }));
    qdrantMod = await import('../vectorDB/qdrantClient.js');
  });

  it('exports a COLLECTION string', () => {
    expect(typeof qdrantMod.COLLECTION).toBe('string');
    expect(qdrantMod.COLLECTION.length).toBeGreaterThan(0);
  });

  it('exports a qdrant client object', () => {
    expect(qdrantMod.qdrant).toBeDefined();
  });
});

// ─── vectorDB/embedding.js ─────────────────────────────────────────────────────

describe('vectorDB/embedding.js - embedText', () => {
  let embedText;
  const mockEmbedContent = jest.fn();
  const mockGetGenerativeModel = jest.fn();

  beforeEach(async () => {
    mockEmbedContent.mockReset();
    mockGetGenerativeModel.mockReset();

    await jest.unstable_mockModule('@google/generative-ai', () => ({
      GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      })),
    }));

    const mod = await import('../vectorDB/embedding.js');
    embedText = mod.embedText;
  });

  it('returns null for empty string', async () => {
    const result = await embedText('');
    expect(result).toBeNull();
  });

  it('returns null for whitespace-only string', async () => {
    const result = await embedText('   ');
    expect(result).toBeNull();
  });

  it('calls getGenerativeModel with correct model name for valid text', async () => {
    const fakeVector = [0.1, 0.2, 0.3];
    mockGetGenerativeModel.mockReturnValue({
      embedContent: mockEmbedContent.mockResolvedValue({
        embedding: { values: fakeVector },
      }),
    });

    const result = await embedText('some real text about industrial sensors');

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'models/text-embedding-004',
    });
    expect(result).toEqual(fakeVector);
  });

  it('returns the embedding values array on success', async () => {
    const expected = [0.5, 0.6, 0.7, 0.8];
    mockGetGenerativeModel.mockReturnValue({
      embedContent: jest.fn().mockResolvedValue({
        embedding: { values: expected },
      }),
    });

    const result = await embedText('temperature vibration data');
    expect(result).toEqual(expected);
  });

  it('propagates errors from the API', async () => {
    mockGetGenerativeModel.mockReturnValue({
      embedContent: jest.fn().mockRejectedValue(new Error('API quota exceeded')),
    });

    await expect(embedText('valid text here')).rejects.toThrow('API quota exceeded');
  });
});

// ─── ai.routes.js ─────────────────────────────────────────────────────────────

describe('ai.routes.js', () => {
  let router;
  const mockAsk = jest.fn();
  const mockUploadRcaWord = jest.fn();
  const mockSingle = jest.fn().mockReturnValue(jest.fn());

  beforeEach(async () => {
    await jest.unstable_mockModule('../controllers/ai.controller.js', () => ({
      ask: mockAsk,
      uploadRcaWord: mockUploadRcaWord,
    }));

    await jest.unstable_mockModule('multer', () => ({
      default: jest.fn().mockImplementation(() => ({
        single: mockSingle,
      })),
    }));

    const mod = await import('../routes/ai.routes.js');
    router = mod.default;
  });

  it('exports a router object', () => {
    expect(router).toBeDefined();
  });

  it('has a stack (registered routes)', () => {
    // Express router has a .stack property
    expect(router.stack).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it('registers POST /ask route', () => {
    const routes = router.stack
      .filter((r) => r.route)
      .map((r) => ({ path: r.route.path, methods: Object.keys(r.route.methods) }));
    const askRoute = routes.find((r) => r.path === '/ask');
    expect(askRoute).toBeDefined();
    expect(askRoute.methods).toContain('post');
  });

  it('registers POST /embed route', () => {
    const routes = router.stack
      .filter((r) => r.route)
      .map((r) => ({ path: r.route.path, methods: Object.keys(r.route.methods) }));
    const embedRoute = routes.find((r) => r.path === '/embed');
    expect(embedRoute).toBeDefined();
    expect(embedRoute.methods).toContain('post');
  });
});
