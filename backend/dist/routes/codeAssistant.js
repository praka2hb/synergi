"use strict";
/**
 * Route: POST /api/chat/code
 * Accepts { message: string }, streams SSE response from the Code Assistant Agent.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const codeAssistantAgent_1 = require("../agents/codeAssistantAgent");
const router = (0, express_1.Router)();
const requestSchema = zod_1.z.object({
    message: zod_1.z.string().min(1, "Message is required"),
});
router.post("/", async (req, res) => {
    try {
        const { message } = requestSchema.parse(req.body);
        // Set SSE headers using the same CORS policy as the main app
        const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Headers": "Cache-Control, Content-Type, Authorization",
        });
        const sendEvent = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        sendEvent("ai_start", { message: "Code Assistant is thinking..." });
        const result = await (0, codeAssistantAgent_1.codeAssistantAgent)(message);
        for await (const part of result.fullStream) {
            switch (part.type) {
                case "text-delta":
                    sendEvent("text-delta", { text: part.text });
                    break;
                case "tool-call":
                    sendEvent("tool-call", {
                        toolName: part.toolName,
                        args: part.args ?? part.input,
                    });
                    break;
                case "tool-result":
                    sendEvent("tool-result", {
                        toolName: part.toolName,
                        result: part.result ?? part.output,
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
    }
    catch (error) {
        console.error("Code assistant route error:", error);
        // If headers haven't been sent, use JSON error
        if (!res.headersSent) {
            if (error instanceof zod_1.z.ZodError) {
                res
                    .status(400)
                    .json({ error: "Invalid request", details: error.issues });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
            return;
        }
        // If SSE already started, send error event
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: "An unexpected error occurred" })}\n\n`);
        res.end();
    }
});
exports.default = router;
