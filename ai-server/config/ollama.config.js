export const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
export const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 1000000);
