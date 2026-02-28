/**
 * Route: POST /api/chat/code
 * Accepts { message: string }, streams SSE response from the Code Assistant Agent.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { codeAssistantAgent } from "../agents/codeAssistantAgent";

const router = Router();

const requestSchema = z.object({
    message: z.string().min(1, "Message is required"),
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const { message } = requestSchema.parse(req.body);

        // Set SSE headers
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
        });

        const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        sendEvent("ai_start", { message: "Code Assistant is thinking..." });

        const result = await codeAssistantAgent(message);

        for await (const part of result.fullStream) {
            switch (part.type) {
                case "text-delta":
                    sendEvent("text-delta", { text: part.text });
                    break;

                case "tool-call":
                    sendEvent("tool-call", {
                        toolName: part.toolName,
                        args: (part as any).args ?? (part as any).input,
                    });
                    break;

                case "tool-result":
                    sendEvent("tool-result", {
                        toolName: part.toolName,
                        result: (part as any).result ?? (part as any).output,
                    });
                    break;

                case "error":
                    sendEvent("error", {
                        error: String(part.error),
                    });
                    break;
            }
        }

        sendEvent("done", { message: "Stream complete" });
        res.end();
    } catch (error) {
        console.error("Code assistant route error:", error);

        // If headers haven't been sent, use JSON error
        if (!res.headersSent) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: "Invalid request", details: error.issues });
            } else {
                res.status(500).json({ error: "Internal server error" });
            }
            return;
        }

        // If SSE already started, send error event
        res.write(`event: error\n`);
        res.write(
            `data: ${JSON.stringify({ error: "An unexpected error occurred" })}\n\n`
        );
        res.end();
    }
});

export default router;
