import { Router } from "express";
import { databaseStatus } from "../db/client.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const database = await databaseStatus();
  const status = database === "connected" || database === "not_configured" ? "ok" : "degraded";
  res.status(database === "unavailable" ? 503 : 200).json({
    status,
    service: "civicpilot-backend",
    database
  });
});
