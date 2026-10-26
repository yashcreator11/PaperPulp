import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function embedText(text) {
  if (!text || !text.trim()) return null;

  const model = genAI.getGenerativeModel({
    model: "models/text-embedding-004"
  });

  const result = await model.embedContent(text);
  return result.embedding.values; // 768-d vector
}
