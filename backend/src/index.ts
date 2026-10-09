import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { pool } from "./db/client.js";
import { healthRouter } from "./routes/health.js";
import { telemetryRouter } from "./routes/telemetry.js";
import { copilotRouter } from "./routes/copilot.js";

import { voiceRouter } from "./routes/voice.js";


const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "CivicPilot API",
    status: "running",
    message: "Backend is working",
    endpoints: {
      health: "/health",
    },
  });
});

app.use("/api", healthRouter);
app.use("/api/telemetry", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));
app.use("/api/telemetry", telemetryRouter);
app.use("/api/copilot", copilotRouter);

app.use(
  "/api/voice",
  rateLimit({
    windowMs: 60_000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use("/api/voice/speech", voiceRouter);


app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[CivicPilot] Request error:", err instanceof Error ? err.message : "Unknown error");
  res.status(500).json({ success: false, error: "Internal server error" });
});

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`CivicPilot backend listening on http://localhost:${env.port}`);
  if (!env.databaseUrl) console.warn("DATABASE_URL missing: database features are unavailable.");
});

async function shutdown() {
  server.close();
  if (pool) await pool.end();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
