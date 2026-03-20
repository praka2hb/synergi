import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function rateLimitKey(req: Request): string {
  const email = req.body?.email;
  if (typeof email === "string" && email.length > 0) {
    return email;
  }
  return ipKeyGenerator(req.ip ?? "");
}

// per-minute limiter
export const perMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Try again in a minute.",
  keyGenerator: rateLimitKey,
  validate: {
    xForwardedForHeader: false,
  },
});

// per-hour limiter
export const perMinuteLimiterRelaxed = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Try again in an hour.",
  keyGenerator: rateLimitKey,
  validate: {
    xForwardedForHeader: false,
  },
});
