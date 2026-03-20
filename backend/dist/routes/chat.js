"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const geminiService_1 = require("../services/geminiService");
const auth_middleware_1 = require("../auth-middleware");
const types_1 = require("../types");
const agents_1 = require("../agents");
const router = (0, express_1.Router)();
const getSseCorsHeaders = (req) => {
    const requestOrigin = req.headers.origin;
    const allowedOrigins = (process.env.ALLOWED_ORIGIN || "*")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    const allowAnyOrigin = allowedOrigins.includes("*");
    const resolvedOrigin = allowAnyOrigin
        ? "*"
        : requestOrigin && allowedOrigins.includes(requestOrigin)
            ? requestOrigin
            : allowedOrigins[0];
    return {
        "Access-Control-Allow-Origin": resolvedOrigin,
        "Access-Control-Allow-Headers": "Cache-Control, Content-Type, Authorization",
        Vary: "Origin",
    };
};
// POST /api/chat/send - Send a message and get AI response (EventStream)
router.post("/send", auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { message, conversationId } = types_1.sendMessageSchema.parse(req.body);
        const userId = req.userId;
        // Set up SSE headers
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            ...getSseCorsHeaders(req),
        });
        const sendEvent = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        // Verify user exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            sendEvent("error", { error: "User not found" });
            return res.end();
        }
        let conversation;
        // Get or create conversation
        if (conversationId && conversationId !== null) {
            conversation = await prisma_1.prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    userId,
                },
                include: {
                    messages: {
                        orderBy: { createdAt: "asc" },
                    },
                },
            });
            if (!conversation) {
                sendEvent("error", { error: "Conversation not found" });
                return res.end();
            }
        }
        else {
            // Create new conversation
            conversation = await prisma_1.prisma.conversation.create({
                data: {
                    userId: userId,
                    title: null, // Will be generated after first exchange
                },
                include: {
                    messages: true,
                },
            });
        }
        // Send conversation created event
        sendEvent("conversation", {
            conversationId: conversation.id,
            conversationTitle: conversation.title,
        });
        // Save user message
        const userMessage = await prisma_1.prisma.message.create({
            data: {
                conversationId: conversation.id,
                userId: userId,
                content: message,
                role: "USER",
            },
        });
        // Send user message event
        sendEvent("user_message", {
            id: userMessage.id,
            content: userMessage.content,
            role: userMessage.role,
            createdAt: userMessage.createdAt,
        });
        // Prepare message history for AI
        const messageHistory = [
            ...conversation.messages.map((m) => ({
                role: m.role.toLowerCase(),
                content: m.content,
            })),
            {
                role: "user",
                content: message,
            },
        ];
        // Route to the appropriate agent using LLM
        const routingResult = await (0, agents_1.routeToAgent)(message, messageHistory);
        sendEvent("agent_selected", {
            agent: routingResult.agent,
            agentName: routingResult.agentName,
            confidence: routingResult.confidence,
            reason: routingResult.reason,
        });
        // Generate AI response with streaming
        sendEvent("ai_start", {
            message: "AI is thinking...",
            agent: routingResult.agent,
        });
        let aiResponse;
        let messageMetadata = null;
        if (routingResult.agent === "weather") {
            // Dedicated weather agent — fetch data, then LLM answers the question
            try {
                // Use the city extracted by the LLM router
                const city = routingResult.extractedCity?.trim();
                if (!city)
                    throw new Error('Could not determine city from your message. Try: "weather in Mumbai"');
                const weatherData = await (0, agents_1.weatherAgent)(city);
                sendEvent("weather_data", weatherData);
                messageMetadata = { weatherData };
                // Build a weather context string the LLM can use to answer
                const weatherContext = [
                    `City: ${weatherData.city}, ${weatherData.country}`,
                    `Current: ${weatherData.temp}°C (feels like ${weatherData.feelsLike}°C) — ${weatherData.description}`,
                    `High: ${weatherData.high}°C / Low: ${weatherData.low}°C`,
                    `Humidity: ${weatherData.humidity}% | Wind: ${weatherData.windspeed} km/h`,
                    `Sunrise: ${weatherData.sunrise} | Sunset: ${weatherData.sunset}`,
                    weatherData.hourly?.length
                        ? `Hourly: ${weatherData.hourly
                            .slice(0, 6)
                            .map((h) => `${h.time} ${h.temp}°C ${h.description}`)
                            .join(", ")}`
                        : "",
                ]
                    .filter(Boolean)
                    .join("\n");
                // Use the LLM to answer the user's actual question with weather data
                const weatherSystemPrompt = `You are Synergi, a weather-aware AI assistant. The user asked a weather-related question. Below is the LIVE weather data you retrieved — use it to directly answer their question in a natural, conversational way. Include relevant data points but don't just dump all the stats. Be concise (2-4 sentences). If the user asked about snow/rain/specific conditions, focus your answer on that.\n\nLIVE WEATHER DATA:\n${weatherContext}`;
                aiResponse = await geminiService_1.geminiService.generateResponseStream([{ role: "user", content: message }], (chunk) => {
                    sendEvent("ai_chunk", { chunk });
                }, weatherSystemPrompt);
            }
            catch (err) {
                aiResponse = `Sorry, I couldn't fetch the weather. ${err.message || "Please try again with a specific city name."}`;
                sendEvent("ai_chunk", { chunk: aiResponse });
            }
        }
        else if (routingResult.agent === "web_search") {
            // Use the web search agent — intercept fullStream for text
            const result = await (0, agents_1.webSearchAgent)(message, messageHistory.slice(0, -1));
            aiResponse = "";
            for await (const part of result.fullStream) {
                if (part.type === "text-delta") {
                    aiResponse += part.text;
                    sendEvent("ai_chunk", { chunk: part.text });
                }
            }
        }
        else if (routingResult.agent === "code_assistant") {
            // Use the code assistant agent — stream tool calls, results, and text
            const result = await (0, agents_1.codeAssistantAgent)(message, messageHistory.slice(0, -1));
            aiResponse = "";
            const toolResultSummaries = [];
            let codeMetadata = {};
            for await (const part of result.fullStream) {
                if (part.type === "text-delta") {
                    aiResponse += part.text;
                    sendEvent("ai_chunk", { chunk: part.text });
                }
                else if (part.type === "tool-call") {
                    const args = part.args ?? part.input;
                    sendEvent("tool_call", {
                        toolName: part.toolName,
                        args,
                    });
                    // Capture source code for persistence
                    if (part.toolName === "executeCode" && args) {
                        codeMetadata = {
                            type: "output",
                            sourceCode: args.code || "",
                            language: args.language || "python",
                        };
                    }
                }
                else if (part.type === "tool-result") {
                    const toolResult = part.result ?? part.output;
                    sendEvent("tool_result", {
                        toolName: part.toolName,
                        result: toolResult,
                    });
                    // Build a summary for the saved message and collect metadata
                    if (part.toolName === "executeCode") {
                        const output = toolResult?.output || toolResult?.error || "(no output)";
                        toolResultSummaries.push(`**Code Output:**\n\`\`\`\n${output}\n\`\`\``);
                        codeMetadata.code = output;
                    }
                    else if (part.toolName === "generateUI") {
                        toolResultSummaries.push(`*UI generated as ${toolResult?.framework === "react" ? "React component" : "HTML page"}. See live preview above.*`);
                        codeMetadata = {
                            type: "ui",
                            code: toolResult?.code || "",
                            framework: toolResult?.framework || "html",
                        };
                    }
                }
            }
            messageMetadata = { codeData: codeMetadata };
            // If no text was streamed but we got tool results, use the summaries
            if (!aiResponse.trim() && toolResultSummaries.length > 0) {
                aiResponse = toolResultSummaries.join("\n\n");
            }
            else if (toolResultSummaries.length > 0) {
                aiResponse = toolResultSummaries.join("\n\n") + "\n\n" + aiResponse;
            }
        }
        else {
            // Use the general assistant
            aiResponse = await geminiService_1.geminiService.generateResponseStream(messageHistory, (chunk) => {
                sendEvent("ai_chunk", { chunk });
            });
        }
        // Save AI message with metadata
        const assistantMessage = await prisma_1.prisma.message.create({
            data: {
                conversationId: conversation.id,
                userId: userId,
                content: aiResponse,
                role: "ASSISTANT",
                ...(messageMetadata ? { metadata: messageMetadata } : {}),
            },
        });
        // Send complete AI message event
        sendEvent("ai_complete", {
            id: assistantMessage.id,
            content: assistantMessage.content,
            role: assistantMessage.role,
            createdAt: assistantMessage.createdAt,
        });
        // Generate title for new conversations after first exchange
        if (!conversation.title && conversation.messages.length === 0) {
            const title = await geminiService_1.geminiService.generateConversationTitle(messageHistory);
            await prisma_1.prisma.conversation.update({
                where: { id: conversation.id },
                data: { title },
            });
            sendEvent("title_generated", { title });
        }
        // Update conversation timestamp
        await prisma_1.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });
        sendEvent("done", { message: "Stream complete" });
        res.end();
    }
    catch (error) {
        console.error("Error in chat send:", error);
        const sendEvent = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        if (error instanceof zod_1.z.ZodError) {
            sendEvent("error", {
                error: "Invalid request data",
                details: error.issues,
            });
        }
        else {
            sendEvent("error", { error: "Internal server error" });
        }
        res.end();
    }
});
// GET /api/chat/conversations - Get user's conversations
router.get("/conversations", auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const conversations = await prisma_1.prisma.conversation.findMany({
            where: { userId },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
                _count: {
                    select: { messages: true },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: limit,
            skip,
        });
        const total = await prisma_1.prisma.conversation.count({
            where: { userId },
        });
        res.json({
            conversations: conversations.map((conv) => ({
                id: conv.id,
                title: conv.title || "New Conversation",
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt,
                messageCount: conv._count.messages,
                lastMessage: conv.messages[0] || null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/chat/conversations/:id/messages - Get messages for a conversation
router.get("/conversations/:id/messages", auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { page, limit } = types_1.getMessagesSchema.parse({
            conversationId: req.params.id,
            page: req.query.page,
            limit: req.query.limit,
        });
        const userId = req.userId;
        const conversationId = req.params.id;
        const skip = (page - 1) * limit;
        // Verify conversation belongs to user
        const conversation = await prisma_1.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                userId,
            },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
        });
        const total = await prisma_1.prisma.message.count({
            where: { conversationId },
        });
        res.json({
            conversationId,
            conversationTitle: conversation.title,
            messages: messages.reverse(), // Reverse to show chronological order
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Error fetching messages:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid request data", details: error.issues });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});
// DELETE /api/chat/conversations/:id - Delete a conversation
router.delete("/conversations/:id", auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const conversationId = req.params.id;
        // Verify conversation belongs to user
        const conversation = await prisma_1.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                userId,
            },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        // Delete conversation (messages will be cascade deleted)
        await prisma_1.prisma.conversation.delete({
            where: { id: conversationId },
        });
        res.json({ message: "Conversation deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting conversation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/chat/agents - Get available agents
router.get("/agents", (req, res) => {
    const agents = (0, agents_1.getAvailableAgents)();
    res.json({ agents });
});
// Health check
router.get("/", (req, res) => {
    res.json({
        message: "Chat API is working",
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
