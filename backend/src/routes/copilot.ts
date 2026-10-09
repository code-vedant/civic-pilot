
import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth } from "../auth/clerk.js";
import { generateGuidance } from "../services/gemini.js";

export const copilotRouter = Router();

const pageContextSchema = z.object({
  headings: z.array(z.string().max(120)).max(8).optional(),
  fieldLabels: z.array(z.string().max(100)).max(30).optional()
}).optional();

const copilotSchema = z.object({
  query: z.string().trim().min(1).max(1500),

  portal: z.object({
    domain: z.string()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9.-]+$/),

    title: z.string().max(200).optional(),
    pageContext: pageContextSchema
  })
});

copilotRouter.post("/", requireClerkAuth, async (req, res) => {
  const parsed = copilotSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request",
      details: parsed.error.flatten()
    });
    return;
  }

  try {
    const { query, portal } = parsed.data;
    const answer = await generateGuidance(query, portal);

    res.json({
      success: true,
      intent: "general_guidance",
      answer,
      actions: []
    });
  } catch (error) {
    console.error(
      "Gemini guidance failed:",
      error instanceof Error ? error.name : "Unknown error",
      error instanceof Error ? error.message : ""
    );

    res.status(503).json({
      success: false,
      error: "AI guidance is temporarily unavailable. Please try again."
    });
  }
});
