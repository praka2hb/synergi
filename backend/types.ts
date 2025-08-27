import { z } from "zod";

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            userId: string; // Make required since auth middleware ensures it's set
        }
    }
}

export const CreateUser = z.object({
    email: z.email(),
})

export const SignIn = z.object({
    email: z.email(),
    otp: z.string().or(z.number().int()),
})

// Chat validation schemas
export const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.uuid().optional(),
});

export const getMessagesSchema = z.object({
  conversationId: z.uuid(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
});

