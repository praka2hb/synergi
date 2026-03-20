import rateLimit from "express-rate-limit";

// per-minute limiter
export const perMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Try again in a minute.",
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
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
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
  validate: {
    xForwardedForHeader: false,
  },
});
