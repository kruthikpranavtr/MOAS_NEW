import { Request, Response } from "express";
import { aiService } from "../services/AIService.js";
import { logger } from "../utils/logger.js";

export class AIController {
  async analyzeResume(req: Request, res: Response) {
    try {
      const result = await aiService.analyzeResume(req.body);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error analyzing resume:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async generateJob(req: Request, res: Response) {
    try {
      const { title, jobTitle } = req.body || {};
      if (!title && !jobTitle) {
        return res.status(400).json({
          success: false,
          error: "jobTitle is required for AI job description generation.",
          message: "jobTitle is required for AI job description generation.",
        });
      }

      const result = await aiService.generateJobDescription(req.body);
      if (result && (result as any).success === false) {
        return res.status(503).json(result);
      }
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error generating job:", error);
      const status = error.message?.includes("unavailable") || error.message?.includes("Gemini") ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Failed to generate job description",
        message: error.message || "Failed to generate job description",
      });
    }
  }

  async smartReply(req: Request, res: Response) {
    try {
      const result = await aiService.generateSmartReply(req.body);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error generating smart reply:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async chat(req: Request, res: Response) {
    try {
      const { message, history, language } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ success: false, error: "Message is required" });
      }
      const result = await aiService.chat({ message, history, language });
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error in chat:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async translate(req: Request, res: Response) {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ success: false, error: "Text and targetLanguage are required" });
      }
      const result = await aiService.translate(text, targetLanguage);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error translating:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async matchScore(req: Request, res: Response) {
    try {
      const result = await aiService.calculateMatchScore(req.body);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error calculating match score:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async ragSearch(req: Request, res: Response) {
    try {
      const { query, jobs, language } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ success: false, error: "Query is required" });
      }
      const result = await aiService.ragSearch(query, jobs, language);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error in rag search:", error);
      return res.status(500).json({ success: false, error: "Failed to perform RAG search", message: error.message });
    }
  }

  async ragJobMatch(req: Request, res: Response) {
    try {
      const { job, candidate } = req.body;
      if (!job || !candidate) {
        return res.status(400).json({ success: false, error: "Job and Candidate profiles are required" });
      }
      const result = await aiService.ragJobMatch(job, candidate);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error in rag job match:", error);
      return res.status(500).json({ success: false, error: "Failed to perform RAG job match", message: error.message });
    }
  }

  async runCareerAgent(req: Request, res: Response) {
    try {
      const { goal, candidateProfile, jobs, targetJobId } = req.body;
      if (!goal || typeof goal !== "string") {
        return res.status(400).json({ success: false, error: "Goal is required" });
      }
      const result = await aiService.runCareerAgent(goal, candidateProfile, jobs, targetJobId);
      return res.json(result);
    } catch (error: any) {
      logger.error("[AI] Error in career agent:", error);
      return res.status(500).json({ success: false, error: "Failed to execute autonomous career agent", message: error.message });
    }
  }
}

export const aiController = new AIController();
