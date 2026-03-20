"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeToAgent = routeToAgent;
exports.getAvailableAgents = getAvailableAgents;
const llmRouter_1 = require("./llmRouter");
// Available agents registry
const AVAILABLE_AGENTS = {
    web_search: {
        name: "Web Search Agent",
        description: "Searches the web for current, real-time information, latest news, live data, recent events, and up-to-date facts",
    },
    weather: {
        name: "Weather Agent",
        description: "Provides instant, accurate weather data including current conditions, hourly forecasts, sunrise/sunset, and more",
    },
    code_assistant: {
        name: "Code Assistant",
        description: "Executes code (Python/JS) in a sandbox and generates UI components, landing pages, and webpages with live preview",
    },
    general: {
        name: "General Assistant",
        description: "Handles general conversation, coding help, creative writing, analysis, math, and knowledge-based questions",
    },
};
/**
 * LLM-powered agent router — uses OpenRouter free models to understand
 * user intent, handle typos, and extract parameters like city names.
 */
async function routeToAgent(message, _conversationContext) {
    const llmResult = await (0, llmRouter_1.llmRouteToAgent)(message, _conversationContext);
    const agentMeta = AVAILABLE_AGENTS[llmResult.agent] || AVAILABLE_AGENTS.general;
    return {
        agent: llmResult.agent,
        confidence: llmResult.confidence,
        reason: llmResult.reason,
        agentName: agentMeta.name,
        extractedCity: llmResult.extractedCity || undefined,
    };
}
/**
 * Returns metadata about available agents (for frontend display)
 */
function getAvailableAgents() {
    return Object.entries(AVAILABLE_AGENTS).map(([key, agent]) => ({
        id: key,
        name: agent.name,
        description: agent.description,
        isActive: true,
    }));
}
