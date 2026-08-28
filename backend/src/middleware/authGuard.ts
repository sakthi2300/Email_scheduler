import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env, logger } from "../config";

/**
 * Payload stored inside the JWT.
 * Attached to `req.user` after verification.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Extend Express Request to include the authenticated user.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Auth guard middleware — verifies the JWT from the `token` HttpOnly cookie.
 * Rejects with 401 if missing/invalid.
 */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: { message: "Authentication required", code: "AUTH_REQUIRED" } });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    logger.warn("Invalid JWT", { error: (err as Error).message });
    res.status(401).json({ error: { message: "Invalid or expired token", code: "AUTH_INVALID" } });
  }
}
