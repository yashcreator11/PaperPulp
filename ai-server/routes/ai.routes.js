import express from 'express';
import multer from 'multer';
import * as aiController from '../controllers/ai.controller.js';

const router = express.Router();

// Multer config
const upload = multer({ dest: 'uploads/' });

// Ask endpoint
router.post('/ask', aiController.ask);

// Embed/upload PDF endpoint
router.post('/embed', upload.single('file'), aiController.uploadRcaWord);

export default router;
