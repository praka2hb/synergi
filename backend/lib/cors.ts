import type { CorsOptions } from "cors";
import type { Response } from "express";

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN?.trim();

  if (!raw || raw === "*") {
    return ["*"];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(): string[] {
  return parseAllowedOrigins();
}

export function isOriginAllowed(origin?: string | null): boolean {
  const allowedOrigins = parseAllowedOrigins();

  if (allowedOrigins.includes("*")) {
    return true;
  }

  if (!origin) {
    return false;
  }

  return allowedOrigins.includes(origin);
}

export function getCorsOptions(): CorsOptions {
  const allowedOrigins = parseAllowedOrigins();
  const allowAll = allowedOrigins.includes("*");

  return {
    origin(origin, callback) {
      if (allowAll) {
        callback(null, true);
        return;
      }

      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  };
}

export function applySseCorsHeaders(
  reqOrigin: string | undefined,
  res: Response
): void {
  const allowedOrigins = parseAllowedOrigins();
  const allowAll = allowedOrigins.includes("*");

  if (allowAll) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (reqOrigin && allowedOrigins.includes(reqOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", reqOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Headers", "Authorization, Cache-Control, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export function writeSseHeaders(
  res: Response,
  reqOrigin?: string
): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  applySseCorsHeaders(reqOrigin, res);

  res.flushHeaders?.();
}
