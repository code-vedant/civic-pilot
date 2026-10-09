
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


/**
 * GET /api/telemetry/me
 * Returns only the authenticated user's logs.
 *
 * Query parameters:
 *   limit=20
 *   offset=0
 *   eventType=copilot_interaction
 */
telemetryRouter.get("/me", requireClerkAuth, async (req, res) => {
  if (!pool) {
    res.status(503).json({
      success: false,
      error: "Database is not configured"
    });
    return;
  }

  const limitValue = Number(req.query.limit ?? 20);
  const offsetValue = Number(req.query.offset ?? 0);
  const eventType =
    typeof req.query.eventType === "string"
      ? req.query.eventType
      : undefined;

  if (
    !Number.isInteger(limitValue) ||
    limitValue < 1 ||
    limitValue > 100 ||
    !Number.isInteger(offsetValue) ||
    offsetValue < 0
  ) {
    res.status(400).json({
      success: false,
      error: "Invalid pagination parameters"
    });
    return;
  }

  const allowedEventTypes = [
    "copilot_interaction",
    "page_load",
    "field_dwell",
    "error"
  ];

  if (eventType && !allowedEventTypes.includes(eventType)) {
    res.status(400).json({
      success: false,
      error: "Invalid eventType"
    });
    return;
  }

  try {
    const values: unknown[] = [req.clerkUserId];
    let filter = "WHERE user_id = $1";

    if (eventType) {
      values.push(eventType);
      filter += ` AND event_type = $${values.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM interaction_logs
       ${filter}`,
      values
    );

    const total = Number(countResult.rows[0]?.total ?? 0);

    values.push(limitValue);
    const limitPlaceholder = `$${values.length}`;

    values.push(offsetValue);
    const offsetPlaceholder = `$${values.length}`;

    const result = await pool.query(
      `SELECT
         id,
         event_type AS "eventType",
         intent,
         target_field_name AS "targetFieldName",
         action_type AS "actionType",
         success,
         response_time_ms AS "responseTimeMs",
         portal_domain AS "portalDomain",
         created_at AS "createdAt"
       FROM interaction_logs
       ${filter}
       ORDER BY created_at DESC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      values
    );

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + result.rows.length < total
      }
    });
  } catch (error) {
    console.error(
      "User logs retrieval failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    res.status(503).json({
      success: false,
      error: "Could not retrieve activity logs"
    });
  }
});

/**
 * GET /api/telemetry/me/summary
 * Returns usage statistics for the authenticated user.
 */
telemetryRouter.get(
  "/me/summary",
  requireClerkAuth,
  async (req, res) => {
    if (!pool) {
      res.status(503).json({
        success: false,
        error: "Database is not configured"
      });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE success)::int AS successful,
           COUNT(*) FILTER (WHERE NOT success)::int AS unsuccessful,
           COUNT(DISTINCT portal_domain)::int AS portals_visited,
           COUNT(*) FILTER (
             WHERE created_at >= NOW() - INTERVAL '7 days'
           )::int AS last_7_days,
           ROUND(AVG(response_time_ms))::int AS avg_response_time_ms
         FROM interaction_logs
         WHERE user_id = $1`,
        [req.clerkUserId]
      );

      const row = result.rows[0];

      res.json({
        success: true,
        summary: {
          total: Number(row.total ?? 0),
          successful: Number(row.successful ?? 0),
          unsuccessful: Number(row.unsuccessful ?? 0),
          portalsVisited: Number(row.portals_visited ?? 0),
          last7Days: Number(row.last_7_days ?? 0),
          averageResponseTimeMs:
            row.avg_response_time_ms == null
              ? null
              : Number(row.avg_response_time_ms)
        }
      });
    } catch (error) {
      console.error(
        "User log summary failed:",
        error instanceof Error ? error.message : "Unknown error"
      );

      res.status(503).json({
        success: false,
        error: "Could not retrieve activity summary"
      });
    }
  }
);
