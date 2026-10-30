import { GoogleGenAI } from "@google/genai";
import { config } from "../config/index.js";

let aiClient: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI | null {
  if (!config.integrations.gemini.isConfigured || !config.integrations.gemini.apiKey) {
    return null;
  }

  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey: config.integrations.gemini.apiKey });
    } catch (err) {
      console.warn("[Gemini AI] Initialization warning:", err);
      aiClient = null;
    }
  }

  return aiClient;
}
