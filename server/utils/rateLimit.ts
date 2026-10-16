import type { Request, RequestHandler } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  // Defaults to the client IP. Login keys on IP + email so one shared church
  // network can't lock everyone out while one account is being guessed.
  keyFn?: (req: Request) => string;
}

// In-memory and per-process: on Replit autoscale each instance keeps its own
// counts, so this caps abuse rather than enforcing an exact global limit.
export function createRateLimiter({ windowMs, max, message, keyFn }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    hits.forEach((entry, key) => {
      if (entry.resetAt <= now) hits.delete(key);
    });
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.ip || "unknown");
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      return res.status(429).json({ message });
    }

    entry.count++;
    next();
  };
}
