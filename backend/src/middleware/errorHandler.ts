import { Request, Response, NextFunction } from "express";
import { logger } from "../config";

/**
 * Standardized error response shape.
 */
interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler — catches all unhandled errors from route handlers.
 * Returns a consistent `{ error: { message, code } }` shape.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = statusCode === 500 ? "Internal server error" : err.message;

  logger.error("Request error", {
    statusCode,
    code,
    message: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: { message, code },
  });
}

/**
 * Factory to create typed application errors with a status code.
 */
export function createAppError(
  message: string,
  statusCode: number,
  code: string
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
