import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import { env } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
      clerkSessionId?: string;
    }
  }
}

export async function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !env.clerkSecretKey) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  try {
    const claims = await verifyToken(token, { secretKey: env.clerkSecretKey });
    if (!claims.sub) {
      res.status(401).json({ success: false, error: "Invalid session" });
      return;
    }
    req.clerkUserId = claims.sub;
    req.clerkSessionId = typeof claims.sid === "string" ? claims.sid : undefined;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid authentication token" });
  }
}
