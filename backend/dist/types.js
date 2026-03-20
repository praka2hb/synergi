"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessagesSchema = exports.sendMessageSchema = exports.SignIn = exports.CreateUser = void 0;
const zod_1 = require("zod");
exports.CreateUser = zod_1.z.object({
    email: zod_1.z.email(),
});
exports.SignIn = zod_1.z.object({
    email: zod_1.z.email(),
    otp: zod_1.z.coerce
        .string()
        .trim()
        .regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});
// Chat validation schemas
exports.sendMessageSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(10000),
    conversationId: zod_1.z.uuid().optional().nullable(),
});
exports.getMessagesSchema = zod_1.z.object({
    conversationId: zod_1.z.uuid(),
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 50)),
});
