"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSearchAgent = void 0;
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const ai_1 = require("ai");
const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({ apiKey: process.env.OPENROUTER_API_KEY });
const MODEL = "openrouter/free";
const core_1 = require("@tavily/core");
const zod_1 = require("zod");
const tavilyClient = (0, core_1.tavily)({ apiKey: process.env.TAVILY_API_KEY });
const webSearchAgent = async (userMessage, messageHistory = []) => {
    // Build messages array: include history + latest user message
    const messages = [
        ...messageHistory.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        { role: "user", content: userMessage },
    ];
    return (0, ai_1.streamText)({
        model: openrouter(MODEL),
        system: `You are Synergi's Web Search Agent — a specialized assistant within the Synergi Multi-Agent system.

Your capabilities:
- Search the web for current, real-time information using the search tool
- Synthesize information from multiple sources into clear, accurate answers
- Always cite your sources with URLs so users can verify

Guidelines:
- Use the search tool for any real-time or current information queries
- You may call the tool multiple times to gather comprehensive information
- Summarize findings clearly and concisely
- Format responses with markdown for readability
- If results are insufficient, say so honestly`,
        messages,
        tools: {
            search: (0, ai_1.tool)({
                description: "Search the web for current information on any topic. Use this when the user needs up-to-date or real-time data.",
                inputSchema: (0, ai_1.zodSchema)(zod_1.z.object({
                    query: zod_1.z
                        .string()
                        .describe("The search query to find relevant information"),
                })),
                execute: async ({ query }) => {
                    const results = await tavilyClient.search(query, {
                        maxResults: 5,
                    });
                    return results.results.map((r) => ({
                        title: r.title,
                        url: r.url,
                        content: r.content,
                    }));
                },
            }),
        },
        stopWhen: (0, ai_1.stepCountIs)(5),
    });
};
exports.webSearchAgent = webSearchAgent;
