import { Router } from "express";
import { z } from "zod";

import { requireClerkAuth } from "../auth/clerk.js";
import { generateGuidance } from "../services/aiGuidanceService.js";

export const copilotRouter = Router();

const pageContextSchema = z
  .object({
    title: z.string().max(200).optional(),
    domain: z.string().max(255).optional(),
    headings: z.array(z.string().max(120)).max(8).optional(),
    fieldLabels: z.array(z.string().max(100)).max(30).optional(),
  })
  .optional();

const portalSchema = z.object({
  domain: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+$/),

  title: z.string().max(200).optional(),
  pageContext: pageContextSchema,
});

const copilotSchema = z.object({
  query: z.string().trim().min(1).max(1500),
  portal: portalSchema,
  // Also accept the top-level context sent by the extension.
  pageContext: pageContextSchema,
});

copilotRouter.post("/", requireClerkAuth, async (req, res) => {
  const parsed = copilotSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const { query, portal, pageContext } = parsed.data;

    const normalizedPortal = {
      ...portal,
      pageContext: {
        ...pageContext,
        ...portal.pageContext,
        domain: portal.domain,
        title: portal.pageContext?.title || portal.title,
      },
    };

    console.log(`[CivicPilot] Received guidance request for domain: ${normalizedPortal.domain}, query length: ${query.length}`);
    

    const answer = await generateGuidance(query, normalizedPortal);

    return res.status(200).json({
      success: true,
      intent: "general_guidance",
      answer,
      actions: [],
    });
  } catch (error) {
    console.error(
      "[CivicPilot] Guidance orchestration failed:",
      error instanceof Error ? error.name : "UnknownError",
    );

    return res.status(503).json({
      success: false,
      error:
        "CivicPilot guidance is temporarily unavailable. Please try again.",
    });
  }
});