import { Request, Response, NextFunction } from "express";

export const DB_UNAVAILABLE_CODE = "DB_UNAVAILABLE";

export class DatabaseUnavailableError extends Error {
  code = DB_UNAVAILABLE_CODE;
  
  constructor(originalError?: Error) {
    super("Database temporarily unavailable. Please try again shortly.");
    this.name = "DatabaseUnavailableError";
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

const NEON_DISABLED_PATTERNS = [
  "The endpoint has been disabled",
  "endpoint has been disabled",
  "Enable it using Neon API",
];

const CONNECTION_ERROR_PATTERNS = [
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "connection refused",
  "Connection terminated unexpectedly",
  "Connection terminated",
  "timeout expired",
  "could not connect",
  "unable to connect",
  "no pg_hba.conf entry",
];

export function isNeonDisabledError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return NEON_DISABLED_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return CONNECTION_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export function isDatabaseUnavailable(error: unknown): boolean {
  return isNeonDisabledError(error) || isConnectionError(error);
}

export function wrapDatabaseError(error: unknown): Error {
  if (isDatabaseUnavailable(error)) {
    console.error("[DB_UNAVAILABLE] Database connection failed:", 
      error instanceof Error ? error.message : String(error)
    );
    return new DatabaseUnavailableError(error instanceof Error ? error : undefined);
  }
  return error instanceof Error ? error : new Error(String(error));
}

export function dbErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof DatabaseUnavailableError || isDatabaseUnavailable(err)) {
    console.error("[DB_UNAVAILABLE] Caught in middleware:", err.message);
    return res.status(503).json({
      code: DB_UNAVAILABLE_CODE,
      message: "Database temporarily unavailable. Please try again shortly.",
    });
  }
  next(err);
}

export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw wrapDatabaseError(error);
  }
}

export function handleApiError(error: unknown, res: Response): Response {
  if (isDatabaseUnavailable(error)) {
    console.error("[DB_UNAVAILABLE] API error:", error instanceof Error ? error.message : String(error));
    return res.status(503).json({
      code: DB_UNAVAILABLE_CODE,
      message: "Database temporarily unavailable. Please try again shortly.",
    });
  }
  
  console.error("API error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return res.status(500).json({ message });
}
