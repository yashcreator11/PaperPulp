// services/ollama.service.js
// Minimal Ollama wrapper using global fetch (Node 18+). If you don't have fetch, install node-fetch and uncomment below.
// const fetch = require('node-fetch');

import { OLLAMA_BASE, OLLAMA_MODEL, REQUEST_TIMEOUT_MS } from '../config/ollama.config.js';
import logger from '../utils/logger.js';

function timeoutPromise(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('request timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Chat with Ollama
 * messages built from system + user
 * returns raw ollama JSON
 */
async function chat(userPrompt, systemPrompt = null, opts = {}) {
  const model = opts.model || OLLAMA_MODEL;
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const body = { model, messages };
  const url = `${OLLAMA_BASE.replace(/\/$/, '')}/api/chat`;

  logger.info('[ollama.service.chat] calling', { url, model });

  const resp = await timeoutPromise(fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }), REQUEST_TIMEOUT_MS);

  if (!resp.ok) {
    const text = await resp.text().catch(() => '<no body>');
    const err = new Error(`Ollama chat error: ${resp.status} ${resp.statusText} - ${text}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

/**
 * Get embedding(s)
 * text: string or array
 */
async function embed(text, opts = {}) {
  const model = opts.model || OLLAMA_MODEL;
  const body = { model, input: text };
  const url = `${OLLAMA_BASE.replace(/\/$/, '')}/api/embeddings`;

  logger.info('[ollama.service.embed] calling', { url, model });

  const resp = await timeoutPromise(fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }), REQUEST_TIMEOUT_MS);

  if (!resp.ok) {
    const textBody = await resp.text().catch(() => '<no body>');
    const err = new Error(`Ollama embed error: ${resp.status} ${resp.statusText} - ${textBody}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export default  { chat, embed };
