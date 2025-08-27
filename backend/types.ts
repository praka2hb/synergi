import { z } from "zod";

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            userId?: string;
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

