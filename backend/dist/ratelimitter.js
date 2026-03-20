"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.perMinuteLimiterRelaxed = exports.perMinuteLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// per-minute limiter
exports.perMinuteLimiter = (0, express_rate_limit_1.default)({
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
exports.perMinuteLimiterRelaxed = (0, express_rate_limit_1.default)({
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
