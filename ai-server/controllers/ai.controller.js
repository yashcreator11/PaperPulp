// controllers/ai.controller.js
import fs from "fs";
import { COLLECTION, qdrant } from '../vectorDB/qdrantClient.js';
import { embedText } from '../vectorDB/embedding.js';
import { v4 as uuidv4 } from "uuid";
import { validateAndResolveLLMFirst } from '../services/queryValidator.service.js';
import { enrichSignalData2, getDataForLLM, getThresholdViolations } from '../services/analysedSignalData.js';
import { handleUserQueryWithLangGraph } from '../services/telemetryTool.js';
import { rcaGraph } from '../services/rca.graph.js';
import mammoth from "mammoth";


// ---------------- LLM RCA ----------------
export async function ask(req, res) {
  try {
    const { prompt, system, sessionId } = req.body;

    // 1️⃣ Validate query using LLM
    const validation = await validateAndResolveLLMFirst(prompt, sessionId);

    if (!validation.valid) {
      return res.status(200).json({
        success: false,
        data: validation.message
      });
    }

    const SignalData = await handleUserQueryWithLangGraph(validation.message);
    console.log("SignalData received:", SignalData);

    const data = getThresholdViolations(SignalData);

    console.log("the vol data length is",data.length)

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No anomalies detected."
      });
    }

    const enrichedData = await enrichSignalData2(data);
    const llmInput = getDataForLLM(enrichedData);

    const result = await rcaGraph.invoke({
      input: llmInput,
      userQuery: SignalData.userQuery
    });

    return res.status(200).json({
      success: true,
      asset: Object.keys(llmInput.assets)[0],
      rca: result.finalRCA || "RCA explanation unavailable"
    });

  } catch (err) {
    console.error("RCA ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "RCA generation failed",
      error: err.message
    });
  }
}

export async function extractTextFromWord(path) {
  const result = await mammoth.extractRawText({ path });
  return result.value.trim();
}


export async function uploadRcaWord(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = req.file.originalname.split(".").pop().toLowerCase();
    if (ext !== "docx") {
      return res.status(400).json({ error: "Only .docx files are supported" });
    }

    const text = await extractTextFromWord(req.file.path);

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "No readable text found" });
    }

    const chunks = text
      .split(/RCA REPORT/i)
      .map(c => c.trim())
      .filter(c => c.length > 50)
      .map(c => "RCA REPORT\n" + c);

    const points = [];

    for (const chunk of chunks) {
      const vector = await embedText(chunk);
      if (!vector) continue;

      points.push({
        id: uuidv4(),
        vector,
        payload: {
          document: chunk,
          source: req.file.originalname
        }
      });
    }

    if (!points.length) {
      return res.status(400).json({ error: "No valid chunks to store" });
    }

    await qdrant.upsert(COLLECTION, {
      points,
      wait: true
    });

    res.json({
      success: true,
      stored: points.length
    });
  } catch (err) {
    console.error("Word ingestion error:", err);
    res.status(500).json({
      error: "Word ingestion failed",
      details: err.message
    });
  }
}


export default { ask, uploadRcaWord };

