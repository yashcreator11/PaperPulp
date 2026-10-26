import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import logger from './utils/logger.js';
import aiRoutes from './routes/ai.routes.js';
import { ensureCollection } from './utils/utils.js';
await ensureCollection(); // make sure collection exists before handling requests

const app = express();
const PORT = process.env.PORT || 5004;

// CORS (accept all)
app.use(cors());
app.options('*', cors());

// Parse JSON
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'production' }));

// AI routes
app.use('/api/ai', aiRoutes);

// Default error handler
app.use((err, req, res, next) => {
  logger.error('[server] unhandled error', err?.stack || err);
  res.status(500).json({ success: false, error: err?.message || 'Internal Server Error' });
});


app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});
