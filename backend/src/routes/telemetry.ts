
import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth } from "../auth/clerk.js";
import { env } from "../config/env.js";
import { pool } from "../db/client.js";

export const telemetryRouter = Router();

const schema = z.object({
  eventType: z.enum([
    "copilot_interaction",
    "page_load",
    "field_dwell",
    "error"
  ]),
  intent: z
    .enum([
      "field_location",
      "security_sensitive",
      "general_guidance"
    ])
    .optional(),
  targetFieldId: z.string().max(200).optional(),
  targetFieldName: z.string().max(200).optional(),
  actionType: z
    .enum([
      "spotlight",
      "manual_security_pause",
      "guidance",
      "blocked"
    ])
    .optional(),
  success: z.boolean(),
  responseTimeMs: z.number().int().min(0).max(600000).optional(),
  portalDomain: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+$/)
});

telemetryRouter.post("/", requireClerkAuth, async (req, res) => {
  if (!env.telemetryEnabled) {
    res.status(503).json({
      success: false,
      error: "Telemetry disabled"
    });
    return;
  }

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid telemetry payload",
      issues: parsed.error.issues
    });
    return;
  }

  if (!pool) {
    res.status(503).json({
      success: false,
      error: "Database is not configured"
    });
    return;
  }

  const event = parsed.data;

  try {
    await pool.query(
      `INSERT INTO interaction_logs
        (
          user_id,
          clerk_session_id,
          event_type,
          intent,
          target_field_id,
          target_field_name,
          action_type,
          success,
          response_time_ms,
          portal_domain
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        req.clerkUserId,
        req.clerkSessionId ?? null,
        event.eventType,
        event.intent ?? null,
        event.targetFieldId ?? null,
        event.targetFieldName ?? null,
        event.actionType ?? null,
        event.success,
        event.responseTimeMs ?? null,
        event.portalDomain
      ]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Telemetry storage failed:", error);

    res.status(503).json({
      success: false,
      error: "Telemetry storage unavailable"
    });
  }
});
