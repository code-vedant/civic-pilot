import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;
export const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl, max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 })
  : null;

export async function databaseStatus(): Promise<"connected" | "unavailable" | "not_configured"> {
  if (!pool) return "not_configured";
  try {
    await pool.query("SELECT 1");
    return "connected";
  } catch {
    return "unavailable";
  }
}
